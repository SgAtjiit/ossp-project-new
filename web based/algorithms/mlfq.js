export function calculateMLFQ(processes, queuesConfig) {
    // Deep copy processes
    let allProcesses = JSON.parse(JSON.stringify(processes));
    let timeline = [];
    let currentTime = 0;
    let completedProcesses = [];

    // All processes start in Queue 0
    let queues = queuesConfig.map(() => []);

    // We need to track which queue a process is currently in.
    allProcesses.forEach(p => {
        p.currentQueueIndex = 0;
        p.timeInCurrentQueue = 0; // Track how long it ran in current queue to enforce quantum
    });

    while (completedProcesses.length < allProcesses.length) {
        // 1. Move newly arrived processes to Queue 0
        allProcesses.forEach(p => {
            if (p.arrivalTime <= currentTime && p.remainingTime > 0 && !p.inQueue) {
                queues[0].push(p);
                p.inQueue = true;
            }
        });

        let processExecuted = false;
        let activeQueueIndex = -1;

        // 2. Find highest priority queue with processes
        for (let i = 0; i < queues.length; i++) {
            if (queues[i].length > 0) {
                activeQueueIndex = i;
                break;
            }
        }

        if (activeQueueIndex === -1) {
            // No ready processes, jump to next arrival
            let nextArrival = Infinity;
            allProcesses.forEach(p => {
                if (p.remainingTime > 0 && p.arrivalTime > currentTime) {
                    nextArrival = Math.min(nextArrival, p.arrivalTime);
                }
            });

            if (nextArrival === Infinity) break;

            timeline.push({
                processId: 'idle',
                startTime: currentTime,
                endTime: nextArrival,
                queueId: null,
                reason: "CPU is idle (no ready processes)."
            });
            currentTime = nextArrival;
            continue;
        }

        // 3. Execute process from active queue
        let currentQueue = queues[activeQueueIndex];
        let config = queuesConfig[activeQueueIndex];
        let process = currentQueue[0]; // Pick first (FCFS within queue usually, or RR)

        // MLFQ Logic:
        // Run for 1 unit time
        let runTime = 1;
        let startTime = currentTime;

        process.remainingTime -= runTime;
        process.timeInCurrentQueue += runTime;
        currentTime += runTime;

        // Update Timeline
        // Merge with previous block if same process AND same queue
        if (timeline.length > 0 &&
            timeline[timeline.length - 1].processId === process.id &&
            timeline[timeline.length - 1].endTime === startTime &&
            timeline[timeline.length - 1].queueId === (activeQueueIndex + 1)) {
            timeline[timeline.length - 1].endTime = currentTime;
        } else {
            timeline.push({
                processId: process.id,
                startTime: startTime,
                endTime: currentTime,
                queueId: activeQueueIndex + 1,
                reason: `Selected P${process.id} from Queue ${activeQueueIndex + 1} because it is the highest priority queue with ready processes.`
            });
        }

        // Check for completion
        if (process.remainingTime === 0) {
            process.finishTime = currentTime;
            process.turnaroundTime = process.finishTime - process.arrivalTime;
            process.waitingTime = process.turnaroundTime - process.burstTime;

            // Remove from queue
            currentQueue.shift();
            completedProcesses.push(process);
        } else {
            // Check for Demotion (if Quantum used up)
            // Only if not the last queue (Last queue usually FCFS or RR with large quantum)
            let quantum = parseInt(config.quantum) || Infinity; // Default to FCFS if no quantum

            if (process.timeInCurrentQueue >= quantum) {
                // Demote
                currentQueue.shift(); // Remove from current
                process.timeInCurrentQueue = 0; // Reset quantum counter

                let nextQueueIdx = activeQueueIndex + 1;
                if (nextQueueIdx >= queues.length) {
                    nextQueueIdx = queues.length - 1; // Stay in last queue (RR usually)
                }

                queues[nextQueueIdx].push(process);
            }
        }

        // Response Time
        if (process.firstRunTime === undefined) {
            process.firstRunTime = startTime;
            process.responseTime = startTime - process.arrivalTime;
        }
    }

    return {
        processes: completedProcesses.sort((a, b) => a.id - b.id),
        timeline: timeline
    };
}
