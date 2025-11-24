export function calculatePriorityNP(processes) {
    const processQueue = JSON.parse(JSON.stringify(processes));
    let currentTime = 0;
    let completed = 0;
    const n = processQueue.length;
    const isCompleted = Array(n).fill(false);
    const timeline = [];

    while (completed < n) {
        let idx = -1;
        let highestPriority = Infinity;

        processQueue.forEach((process, i) => {
            if (process.arrivalTime <= currentTime && !isCompleted[i]) {
                if (process.priority < highestPriority) {
                    highestPriority = process.priority;
                    idx = i;
                } else if (process.priority === highestPriority) {
                    if (process.arrivalTime < processQueue[idx].arrivalTime) {
                        idx = i;
                    }
                }
            }
        });

        if (idx !== -1) {
            if (currentTime < processQueue[idx].arrivalTime) {
                timeline.push({
                    processId: 'idle',
                    startTime: currentTime,
                    endTime: processQueue[idx].arrivalTime
                });
                currentTime = processQueue[idx].arrivalTime;
            }

            processQueue[idx].startTime = currentTime;
            processQueue[idx].responseTime = currentTime - processQueue[idx].arrivalTime;
            processQueue[idx].waitingTime = processQueue[idx].responseTime;
            currentTime += processQueue[idx].burstTime;
            processQueue[idx].finishTime = currentTime;
            processQueue[idx].turnaroundTime = processQueue[idx].finishTime - processQueue[idx].arrivalTime;
            isCompleted[idx] = true;
            completed++;

            timeline.push({
                processId: processQueue[idx].id,
                startTime: processQueue[idx].startTime,
                endTime: processQueue[idx].finishTime
            });
        } else {
            currentTime++;
        }
    }

    return { timeline, processes: processQueue };
}

export function calculatePriorityP(processes) {
    const processQueue = JSON.parse(JSON.stringify(processes));
    let currentTime = 0;
    let completed = 0;
    const n = processQueue.length;
    const timeline = [];
    let currentProcess = null;

    while (completed < n) {
        let availableProcesses = processQueue.filter(p =>
            p.remainingTime > 0 && p.arrivalTime <= currentTime
        );

        if (availableProcesses.length === 0) {
            if (currentProcess) {
                timeline.push({
                    processId: currentProcess.id,
                    startTime: currentProcess.startTime,
                    endTime: currentTime
                });
                currentProcess = null;
            }
            currentTime++;
            continue;
        }

        let highestPriority = availableProcesses.reduce((prev, curr) =>
            prev.priority < curr.priority ? prev : curr
        );

        if (highestPriority.startTime === -1) {
            highestPriority.startTime = currentTime;
            highestPriority.responseTime = currentTime - highestPriority.arrivalTime;
        }

        if (currentProcess && currentProcess.priority > highestPriority.priority) {
            timeline.push({
                processId: currentProcess.id,
                startTime: currentProcess.startTime,
                endTime: currentTime
            });
            highestPriority.startTime = currentTime;
            currentProcess = highestPriority;
        }

        // Find the process with the highest priority among available processes
        let highestPriorityProcess = availableProcesses.reduce((prev, curr) => {
            if (prev.priority < curr.priority) {
                return prev;
            } else if (prev.priority === curr.priority) {
                // Tie-breaking: FCFS
                return prev.arrivalTime < curr.arrivalTime ? prev : curr;
            }
            return curr;
        });

        // Check for preemption or new process selection
        if (currentProcessId === null || highestPriorityProcess.id !== currentProcessId) {
            // If a different process is selected or CPU was idle
            if (currentProcessId !== null) {
                // A process was running and is now being preempted
                timeline.push({
                    processId: currentProcessId,
                    startTime: currentProcessStartTime,
                    endTime: currentTime,
                    reason: `Preempted by P${highestPriorityProcess.id} (Priority: ${highestPriorityProcess.priority}) which has higher priority.`
                });
            }

            // Start the new highest priority process
            currentProcessId = highestPriorityProcess.id;
            currentProcessStartTime = currentTime;

            // Set response time if it's the first time this process is running
            const processIndex = processQueue.findIndex(p => p.id === currentProcessId);
            if (processQueue[processIndex].startTime === -1) {
                processQueue[processIndex].startTime = currentTime;
                processQueue[processIndex].responseTime = currentTime - processQueue[processIndex].arrivalTime;
            }
        }

        // Execute the current process for one time unit
        const processIndex = processQueue.findIndex(p => p.id === currentProcessId);
        processQueue[processIndex].remainingTime--;
        currentTime++;

        // Add to timeline for the current time unit
        if (timeline.length > 0 && timeline[timeline.length - 1].processId === currentProcessId && timeline[timeline.length - 1].endTime === currentTime - 1) {
            timeline[timeline.length - 1].endTime++;
        } else {
            timeline.push({
                processId: currentProcessId,
                startTime: currentTime - 1,
                endTime: currentTime,
                reason: `Selected P${currentProcessId} because it has the highest priority).`
            });
        }

        // Check if the current process has completed
        if (processQueue[processIndex].remainingTime === 0) {
            processQueue[processIndex].finishTime = currentTime;
            processQueue[processIndex].turnaroundTime = processQueue[processIndex].finishTime - processQueue[processIndex].arrivalTime;
            processQueue[processIndex].waitingTime = processQueue[processIndex].turnaroundTime - processQueue[processIndex].burstTime;
            completed++;

            // The segment for this process was already pushed per time unit.
            // No need to push a final segment here, as the timeline already reflects its execution.
            // Reset currentProcessId as it has completed
            currentProcessId = null;
            currentProcessStartTime = -1;
        }
    }

    return { timeline, processes: processQueue };
}
