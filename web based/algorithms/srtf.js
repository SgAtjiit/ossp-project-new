export function calculateSRTF(processes) {
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
                // If we were running a process, but now nothing is available (shouldn't happen if preemptive, but for safety)
                currentProcess = null;
            }
            // Add idle time
            if (timeline.length > 0 && timeline[timeline.length - 1].processId === 'idle' && timeline[timeline.length - 1].endTime === currentTime) {
                timeline[timeline.length - 1].endTime++;
            } else {
                timeline.push({
                    processId: 'idle',
                    startTime: currentTime,
                    endTime: currentTime + 1,
                    reason: "CPU is idle (no ready processes)."
                });
            }
            currentTime++;
            continue;
        }

        let shortestJob = availableProcesses.reduce((prev, curr) =>
            prev.remainingTime < curr.remainingTime ? prev : curr
        );

        if (shortestJob.startTime === -1) {
            shortestJob.startTime = currentTime;
            shortestJob.responseTime = currentTime - shortestJob.arrivalTime;
        }

        // Check for preemption or new process selection
        if (!currentProcess || currentProcess.id !== shortestJob.id) {
            // If a different process is selected
            if (currentProcess) {
                // Preemption occurred
                // We don't need to add a specific "preempted" block, just start the new one.
                // The previous block ended at currentTime.
            }

            // Start a new segment for shortestJob
            timeline.push({
                processId: shortestJob.id,
                startTime: currentTime,
                endTime: currentTime + 1,
                reason: `Selected P${shortestJob.id} because it has the shortest remaining time (Remaining: ${shortestJob.remainingTime}).`
            });
        } else {
            // If the same process is continuing, extend its current segment
            if (timeline.length > 0 && timeline[timeline.length - 1].processId === currentProcess.id && timeline[timeline.length - 1].endTime === currentTime) {
                timeline[timeline.length - 1].endTime++;
                timeline[timeline.length - 1].reason = `P${currentProcess.id} continues (Remaining: ${currentProcess.remainingTime - 1}).`;
            } else {
                timeline.push({
                    processId: shortestJob.id,
                    startTime: currentTime,
                    endTime: currentTime + 1,
                    reason: `Selected P${shortestJob.id} because it has the shortest remaining time (Remaining: ${shortestJob.remainingTime}).`
                });
            }
        }

        currentProcess = shortestJob;
        currentProcess.remainingTime--;
        currentTime++;

        if (currentProcess.remainingTime === 0) {
            currentProcess.finishTime = currentTime;
            currentProcess.turnaroundTime = currentProcess.finishTime - currentProcess.arrivalTime;
            currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
            completed++;

            // Update reason for completion
            if (timeline.length > 0 && timeline[timeline.length - 1].processId === currentProcess.id && timeline[timeline.length - 1].endTime === currentTime) {
                timeline[timeline.length - 1].reason = `P${currentProcess.id} completed.`;
            }
            currentProcess = null;
        }
    }

    return { timeline, processes: processQueue };
}
