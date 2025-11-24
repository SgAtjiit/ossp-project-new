export function calculateMQ(processes, queuesConfig) {
    // Deep copy processes to avoid modifying original
    let allProcesses = JSON.parse(JSON.stringify(processes));
    let timeline = [];
    let currentTime = 0;
    let completedProcesses = [];

    // Assign processes to queues based on queueId
    // Queue ID 1 -> Index 0, Queue ID 2 -> Index 1, etc.
    let queues = queuesConfig.map(() => []);

    allProcesses.forEach(p => {
        // Default to Queue 1 if not specified
        let qId = p.queueId || 1;
        let queueIndex = qId - 1;

        if (queueIndex >= queues.length) {
            queueIndex = queues.length - 1;
        } else if (queueIndex < 0) {
            queueIndex = 0;
        }
        queues[queueIndex].push(p);
    });

    // Sort each queue by arrival time initially
    queues.forEach(q => q.sort((a, b) => a.arrivalTime - b.arrivalTime));

    // Main simulation loop
    while (completedProcesses.length < allProcesses.length) {
        let processExecuted = false;

        // Iterate through queues in order of priority (0 is highest)
        for (let i = 0; i < queues.length; i++) {
            let currentQueue = queues[i];
            let config = queuesConfig[i];

            // Filter processes that have arrived
            let availableProcesses = currentQueue.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);

            if (availableProcesses.length > 0) {
                // Found a queue with available processes.
                let activeQueueIndex = i;

                // We have an active queue.
                let qConfig = queuesConfig[activeQueueIndex];
                let readyProcesses = availableProcesses; // Already filtered

                let selectedProcess = null;

                // Select process based on Queue Algorithm
                if (qConfig.algorithm === 'fcfs') {
                    readyProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime);
                    selectedProcess = readyProcesses[0];
                } else if (qConfig.algorithm === 'sjf') {
                    readyProcesses.sort((a, b) => a.burstTime - b.burstTime);
                    selectedProcess = readyProcesses[0];
                } else if (qConfig.algorithm === 'srtf') {
                    readyProcesses.sort((a, b) => a.remainingTime - b.remainingTime);
                    selectedProcess = readyProcesses[0];
                } else if (qConfig.algorithm === 'rr') {
                    selectedProcess = readyProcesses[0];
                } else if (qConfig.algorithm.includes('priority')) {
                    readyProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime);
                    selectedProcess = readyProcesses[0];
                }

                if (selectedProcess) {
                    let startTime = currentTime;
                    let runTime = 0;

                    if (qConfig.algorithm === 'rr') {
                        runTime = Math.min(selectedProcess.remainingTime, parseInt(qConfig.quantum));
                    } else if (qConfig.algorithm === 'srtf' || qConfig.algorithm === 'priority-p') {
                        runTime = 1;
                    } else {
                        runTime = selectedProcess.remainingTime;
                    }

                    // Execute
                    selectedProcess.remainingTime -= runTime;
                    currentTime += runTime;

                    timeline.push({
                        processId: selectedProcess.id,
                        startTime: startTime,
                        endTime: currentTime,
                        queueId: activeQueueIndex + 1, // Add queue ID to timeline
                        reason: `Selected P${selectedProcess.id} from Queue ${activeQueueIndex + 1} (${qConfig.algorithm.toUpperCase()}) because it was the highest priority queue with ready processes.`
                    });

                    if (selectedProcess.remainingTime === 0) {
                        selectedProcess.finishTime = currentTime;
                        selectedProcess.turnaroundTime = selectedProcess.finishTime - selectedProcess.arrivalTime;
                        selectedProcess.waitingTime = selectedProcess.turnaroundTime - selectedProcess.burstTime;
                        completedProcesses.push(selectedProcess);
                    }

                    // For RR, move to back of queue if not finished
                    if (qConfig.algorithm === 'rr' && selectedProcess.remainingTime > 0) {
                        let idx = queues[activeQueueIndex].indexOf(selectedProcess);
                        if (idx > -1) {
                            queues[activeQueueIndex].splice(idx, 1);
                            queues[activeQueueIndex].push(selectedProcess);
                        }
                    }

                    if (selectedProcess.firstRunTime === undefined) {
                        selectedProcess.firstRunTime = startTime;
                        selectedProcess.responseTime = startTime - selectedProcess.arrivalTime;
                    }

                    processExecuted = true;
                    break;
                }
            }
        }

        if (!processExecuted && completedProcesses.length < allProcesses.length) {
            let nextArrival = Infinity;
            queues.forEach(q => {
                q.forEach(p => {
                    if (p.remainingTime > 0 && p.arrivalTime > currentTime) {
                        nextArrival = Math.min(nextArrival, p.arrivalTime);
                    }
                });
            });

            if (nextArrival === Infinity) break;

            timeline.push({
                processId: 'idle',
                startTime: currentTime,
                endTime: nextArrival,
                queueId: null // Idle has no queue
            });
            currentTime = nextArrival;
        }
    }

    return {
        processes: completedProcesses.sort((a, b) => a.id - b.id),
        timeline: timeline
    };
}
