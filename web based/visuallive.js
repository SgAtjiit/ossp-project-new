let simulationState = {
    isRunning: false,
    isPaused: false,
    currentStep: 0,
    timelineSteps: [],
    metricsState: null,
    timeoutId: null,
    simulationSpeed: 1 // 1x speed by default
};

// Speed mapping: 1=0.25x (slowest), 5=2x (fastest)
function getSimulationDelay() {
    const speedMap = {
        1: 4000,  // 0.25x speed (slowest)
        2: 2000,  // 0.5x speed
        3: 1000,  // 1x speed (normal)
        4: 667,   // 1.5x speed
        5: 500    // 2x speed (fastest)
    };
    return speedMap[simulationState.simulationSpeed] || 1000;
}

// Setup speed control
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const speedControl = document.getElementById('speedControl');
        const speedLabel = document.getElementById('speedLabel');

        if (speedControl && speedLabel) {
            speedControl.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                simulationState.simulationSpeed = value;

                const speedText = {
                    1: '0.25x',
                    2: '0.5x',
                    3: '1x',
                    4: '1.5x',
                    5: '2x'
                };
                speedLabel.textContent = speedText[value];
            });
        }
    });
}


export function initializeVisualization(result) {
    // Deep clone processes and timeline
    simulationState.metricsState = {
        processes: JSON.parse(JSON.stringify(result.processes)),
        timeline: JSON.parse(JSON.stringify(result.timeline))
    };

    // Build timeline steps
    simulationState.timelineSteps = [];
    simulationState.metricsState.timeline.forEach(block => {
        for (let t = block.startTime; t < block.endTime; t++) {
            simulationState.timelineSteps.push({
                time: t,
                processId: block.processId,
                isIdle: block.processId === 'idle',
                queueId: block.queueId, // Capture queueId
                reason: block.reason // Capture reason
            });
        }
    });

    // Fill idle gaps
    const maxTime = Math.max(...simulationState.timelineSteps.map(t => t.time), 0);
    for (let t = 0; t <= maxTime; t++) {
        if (!simulationState.timelineSteps.some(step => step.time === t)) {
            simulationState.timelineSteps.push({
                time: t,
                processId: 'idle',
                isIdle: true,
                queueId: null,
                reason: "CPU is idle (no ready processes)."
            });
        }
    }

    simulationState.timelineSteps.sort((a, b) => a.time - b.time);

    // Setup Multi-row container if needed
    const hasQueues = simulationState.timelineSteps.some(s => s.queueId);
    const container = document.getElementById('ganttChartLive');
    container.innerHTML = '';

    if (hasQueues) {
        container.classList.add('multi-row');
        let maxQueueId = 0;
        simulationState.timelineSteps.forEach(s => {
            if (s.queueId) maxQueueId = Math.max(maxQueueId, s.queueId);
        });

        for (let q = 1; q <= maxQueueId; q++) {
            const row = document.createElement('div');
            row.className = 'gantt-row live-row';
            row.id = `live-queue-${q}`;
            row.innerHTML = `<div class="gantt-row-label">Queue ${q}</div><div class="gantt-row-bars"></div>`;
            container.appendChild(row);
        }
    } else {
        container.classList.remove('multi-row');
    }
}

function simulationStep() {
    if (!simulationState.isRunning || simulationState.currentStep >= simulationState.timelineSteps.length) {
        // Update to final time if we finished naturally
        if (simulationState.currentStep >= simulationState.timelineSteps.length && simulationState.timelineSteps.length > 0) {
            const lastStep = simulationState.timelineSteps[simulationState.timelineSteps.length - 1];
            document.getElementById('currentTime').textContent = lastStep.time + 1;
        }
        stopSimulation();
        return;
    }

    if (simulationState.isPaused) {
        clearTimeout(simulationState.timeoutId);
        return;
    }

    const step = simulationState.timelineSteps[simulationState.currentStep];

    updateLiveGantt(step);
    updateLiveMetrics();
    updateLiveProcessTable(step);

    simulationState.currentStep++;
    simulationState.timeoutId = setTimeout(simulationStep, getSimulationDelay());
}

// Modify the startLiveVisualization function
export function startLiveVisualization(result) {
    if (!result) {
        alert('Please calculate the schedule first!');
        return;
    }
    if (simulationState.isRunning) return;

    // Clear previous simulation properly
    document.getElementById('ganttChartLive').innerHTML = '';
    document.getElementById('liveMetrics').style.display = 'block';

    // Initialize fresh state
    simulationState = {
        isRunning: true,
        isPaused: false,
        currentStep: 0,
        timelineSteps: [],
        metricsState: {
            processes: JSON.parse(JSON.stringify(result.processes)),
            timeline: JSON.parse(JSON.stringify(result.timeline))
        },
        timeoutId: null
    };

    initializeVisualization(result); // Use the shared init logic
    createLiveProcessTable();

    // Start simulation
    simulationStep();
}

export function togglePause() {
    if (!simulationState.isRunning) return;
    simulationState.isPaused = !simulationState.isPaused;
    document.getElementById('pauseBtn').textContent = simulationState.isPaused ? '▶ Resume' : '⏸ Pause';

    if (!simulationState.isPaused && simulationState.isRunning) {
        // Resume the simulation if it was running
        simulationStep();
    }
}

export function stopSimulation() {
    simulationState.isRunning = false;
    clearTimeout(simulationState.timeoutId);
}

export function resetSimulation() {
    stopSimulation();
    simulationState.isPaused = false;
    simulationState.currentStep = 0;
    simulationState.timelineSteps = [];
    simulationState.metricsState = null;
    document.getElementById('ganttChartLive').innerHTML = '';
    document.getElementById('liveMetrics').style.display = 'none';
    document.getElementById('liveProcessTable').style.display = 'none';
}

function updateLiveMetrics() {
    const completedProcesses = simulationState.metricsState?.processes?.filter(p =>
        p.finishTime <= simulationState.timelineSteps[simulationState.currentStep]?.time &&
        p.turnaroundTime >= 0
    ) || [];

    // Match final calculation exactly
    const validProcesses = completedProcesses.filter(p =>
        Number.isFinite(p.turnaroundTime) &&
        Number.isFinite(p.waitingTime)
    );

    const avgTurnaround = validProcesses.length > 0 ?
        (validProcesses.reduce((sum, p) => sum + p.turnaroundTime, 0) / validProcesses.length).toFixed(2) : '0.00';

    const avgWaiting = validProcesses.length > 0 ?
        (validProcesses.reduce((sum, p) => sum + p.waitingTime, 0) / validProcesses.length).toFixed(2) : '0.00';

    document.getElementById('currentTime').textContent = simulationState.timelineSteps[simulationState.currentStep]?.time || 0;
    // document.getElementById('avgTurnaroundLive').textContent = avgTurnaround;
    // document.getElementById('avgWaitingLive').textContent = avgWaiting;
}

function updateLiveGantt(step) {
    const ganttChart = document.getElementById('ganttChartLive');
    let targetContainer = ganttChart;

    // Check if multi-row
    if (step.queueId) {
        const row = document.getElementById(`live-queue-${step.queueId}`);
        if (row) {
            targetContainer = row.querySelector('.gantt-row-bars');
        }
    }

    const block = document.createElement('div');

    block.className = `gantt-block-live ${step.isIdle ? 'idle' : ''}`;
    block.textContent = step.isIdle ? 'Idle' : `P${step.processId}`;

    if (!step.isIdle) {
        block.style.backgroundColor = `hsl(${(step.processId * 137.5) % 360}, 70%, 70%)`;
    }

    targetContainer.appendChild(block);

    // Scroll handling
    if (step.queueId) {
        // For multi-row, we might not need to scroll the main container if it's flex column
        // But the bars container might overflow?
        // Actually, the styles for .gantt-row-bars usually hide overflow or wrap?
        // In static chart, it's flex. In live, we append blocks.
        // We should ensure the bars container scrolls if needed.
        targetContainer.scrollLeft = targetContainer.scrollWidth;
    } else {
        ganttChart.scrollLeft = ganttChart.scrollWidth;
    }

    // Update current time display
    document.getElementById('currentTime').textContent = step.time;
}

function createLiveProcessTable() {
    const tableContainer = document.getElementById('liveProcessTable');
    const tbody = document.getElementById('liveProcessTableBody');

    if (!simulationState.metricsState || !simulationState.metricsState.processes) return;

    tableContainer.style.display = 'block';
    tbody.innerHTML = '';

    simulationState.metricsState.processes.forEach(process => {
        const row = document.createElement('tr');
        row.id = `live-process-${process.id}`;
        row.innerHTML = `
            <td>P${process.id}</td>
            <td><span class="process-state state-waiting">Waiting</span></td>
            <td>${process.arrivalTime}</td>
            <td>${process.burstTime}</td>
            <td class="remaining">${process.burstTime}</td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%">0%</div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateLiveProcessTable(step) {
    if (!simulationState.metricsState) return;

    const currentTime = step.time;
    const runningProcessId = step.isIdle ? null : step.processId;

    simulationState.metricsState.processes.forEach(process => {
        const row = document.getElementById(`live-process-${process.id}`);
        if (!row) return;

        const stateCell = row.querySelector('.process-state');
        const remainingCell = row.querySelector('.remaining');
        const progressFill = row.querySelector('.progress-fill');

        // Calculate how much has been executed
        const executed = simulationState.timelineSteps
            .slice(0, simulationState.currentStep + 1)
            .filter(s => s.processId === process.id && !s.isIdle)
            .length;

        let remaining = Math.max(0, process.burstTime - executed);
        let state = 'waiting';

        // Check completion first - if remaining is 0 or finishTime reached
        if (remaining === 0 || (process.finishTime && process.finishTime <= currentTime)) {
            state = 'completed';
            remaining = 0;
        } else if (runningProcessId === process.id) {
            // Currently running
            state = 'running';
        } else if (process.arrivalTime <= currentTime) {
            // Ready (arrived but not running)
            state = 'ready';
        }

        // Update state
        stateCell.className = `process-state state-${state}`;
        stateCell.textContent = state.charAt(0).toUpperCase() + state.slice(1);

        // Update remaining time
        remainingCell.textContent = remaining;

        // Update progress bar
        const progress = ((process.burstTime - remaining) / process.burstTime) * 100;
        progressFill.style.width = `${progress}%`;
        progressFill.textContent = `${Math.round(progress)}%`;
    });
}