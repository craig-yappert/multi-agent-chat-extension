import * as cp from 'child_process';
import { EventEmitter } from 'events';

interface ActiveRequest {
    id: string;
    process?: cp.ChildProcess;
    timeout?: NodeJS.Timeout;
    startTime: number;
    agent: string;
    aborted: boolean;
}

export class RequestManager extends EventEmitter {
    private activeRequests: Map<string, ActiveRequest> = new Map();
    private requestQueue: Array<{
        id: string;
        agent: string;
        message: string;
        resolve: (value: string) => void;
        reject: (error: Error) => void;
    }> = [];
    private isProcessing: boolean = false;
    private maxConcurrent: number = 3;
    private currentConcurrent: number = 0;

    constructor(maxConcurrent: number = 3) {
        super();
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Submit a request to the queue
     */
    async submitRequest(agent: string, message: string): Promise<string> {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return new Promise((resolve, reject) => {
            const request = {
                id: requestId,
                agent,
                message,
                resolve,
                reject
            };

            this.requestQueue.push(request);
            this.processQueue();
        });
    }

    /**
     * Process the request queue with concurrency control
     */
    private async processQueue(): Promise<void> {
        if (this.currentConcurrent >= this.maxConcurrent) {
            return; // Already at max concurrency
        }

        const request = this.requestQueue.shift();
        if (!request) {
            return; // No requests to process
        }

        this.currentConcurrent++;

        const activeRequest: ActiveRequest = {
            id: request.id,
            agent: request.agent,
            startTime: Date.now(),
            aborted: false
        };

        this.activeRequests.set(request.id, activeRequest);

        try {
            // Emit progress event
            this.emit('request-start', {
                id: request.id,
                agent: request.agent
            });

            const result = await this.executeWithTimeout(
                request.id,
                request.agent,
                request.message,
                15000 // 15 second timeout per request
            );

            if (!activeRequest.aborted) {
                request.resolve(result);
                this.emit('request-complete', {
                    id: request.id,
                    agent: request.agent,
                    duration: Date.now() - activeRequest.startTime
                });
            }
        } catch (error) {
            if (!activeRequest.aborted) {
                request.reject(error as Error);
                this.emit('request-error', {
                    id: request.id,
                    agent: request.agent,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        } finally {
            this.activeRequests.delete(request.id);
            this.currentConcurrent--;

            // Process next request
            setImmediate(() => this.processQueue());
        }
    }

    /**
     * Execute a Claude request with timeout and cancellation support
     */
    private async executeWithTimeout(
        requestId: string,
        agent: string,
        message: string,
        timeout: number
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const activeRequest = this.activeRequests.get(requestId);
            if (!activeRequest || activeRequest.aborted) {
                reject(new Error('Request cancelled'));
                return;
            }

            // Start the Claude process
            const args = ['--model', 'sonnet'];
            const claudeProc = cp.spawn('claude', args, {
                shell: process.platform === 'win32'
            });

            activeRequest.process = claudeProc;

            let output = '';
            let errorOutput = '';

            // Set up timeout
            activeRequest.timeout = setTimeout(() => {
                this.cancelRequest(requestId, 'Timeout');
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);

            claudeProc.stdout?.on('data', (data) => {
                output += data.toString();

                // Emit progress chunks
                this.emit('response-chunk', {
                    id: requestId,
                    agent,
                    chunk: data.toString()
                });
            });

            claudeProc.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });

            claudeProc.on('close', (code) => {
                if (activeRequest.timeout) {
                    clearTimeout(activeRequest.timeout);
                }

                if (activeRequest.aborted) {
                    reject(new Error('Request cancelled'));
                } else if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Process failed with code ${code}: ${errorOutput}`));
                }
            });

            claudeProc.on('error', (error) => {
                if (activeRequest.timeout) {
                    clearTimeout(activeRequest.timeout);
                }
                reject(error);
            });

            // Send the message
            if (claudeProc.stdin) {
                claudeProc.stdin.write(message);
                claudeProc.stdin.end();
            }
        });
    }

    /**
     * Cancel a specific request
     */
    cancelRequest(requestId: string, reason: string = 'User cancelled'): void {
        const request = this.activeRequests.get(requestId);
        if (!request) return;

        request.aborted = true;

        // Clear timeout
        if (request.timeout) {
            clearTimeout(request.timeout);
        }

        // Kill process if running
        if (request.process && !request.process.killed) {
            request.process.kill('SIGTERM');

            // Force kill after 2 seconds
            setTimeout(() => {
                if (request.process && !request.process.killed) {
                    request.process.kill('SIGKILL');
                }
            }, 2000);
        }

        this.emit('request-cancelled', {
            id: requestId,
            agent: request.agent,
            reason
        });

        this.activeRequests.delete(requestId);
    }

    /**
     * Cancel all active requests
     */
    cancelAll(reason: string = 'All requests cancelled'): void {
        for (const [id] of this.activeRequests) {
            this.cancelRequest(id, reason);
        }

        // Clear the queue
        this.requestQueue = [];
    }

    /**
     * Get status of all active requests
     */
    getStatus(): {
        active: number;
        queued: number;
        requests: Array<{id: string; agent: string; duration: number}>
    } {
        const now = Date.now();
        return {
            active: this.activeRequests.size,
            queued: this.requestQueue.length,
            requests: Array.from(this.activeRequests.values()).map(req => ({
                id: req.id,
                agent: req.agent,
                duration: now - req.startTime
            }))
        };
    }
}