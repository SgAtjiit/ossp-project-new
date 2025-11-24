import { calculateFCFS } from './algorithms/fcfs.js';
import { calculateSJF } from './algorithms/sjf.js';
import { calculateSRTF } from './algorithms/srtf.js';
import { calculateRR } from './algorithms/roundRobin.js';
import { calculatePriorityNP, calculatePriorityP } from './algorithms/priority.js';
import { calculateMQ } from './algorithms/mq.js';
import { calculateMLFQ } from './algorithms/mlfq.js';
import { startLiveVisualization, togglePause, resetSimulation } from './visuallive.js';

// Make functions globally available
window.lastResult = null;
window.processInput = processInput;
window.calculateScheduling = calculateScheduling;
window.startLiveSimulation = startLiveSimulation;
window.togglePause = togglePause;
window.resetSimulation = resetSimulation;
window.startLiveVisualization = startLiveVisualization;
window.generateQueueInputs = generateQueueInputs;

let processes = [];
let processCounter = 1;

// Dark mode toggle
const darkModeToggle = document.getElementById('checkbox');
const modeIndicator = document.getElementById('modeIndicator');

darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode');
    modeIndicator.textContent = darkModeToggle.checked ? 'Dark Mode' : 'Light Mode';
});

// Check for saved user preference
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
    modeIndicator.textContent = 'Dark Mode';
}

// Save user preference
darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) {
        localStorage.setItem('darkMode', 'enabled');
    } else {
        localStorage.setItem('darkMode', null);
    }
});

// Reset algorithm selection on page load
window.addEventListener('load', () => {
    document.getElementById('algorithm').selectedIndex = 0;
    document.getElementById('arrivalInput').value = '';
    document.getElementById('burstInput').value = '';
    document.getElementById('priorityValues').value = '';
    processes = [];
    processCounter = 1;
    updateProcessTable();
    resetSimulation();
});

// Show/hide inputs based on algorithm selection
document.getElementById('algorithm').addEventListener('change', function () {
    const priorityInput = document.getElementById('priorityInput');
    const queueIdInput = document.getElementById('queueIdInput');
    const timeQuantumInput = document.getElementById('timeQuantumInput');
    const priorityColumn = document.querySelectorAll('.priority-column');
    const queueColumn = document.querySelectorAll('.queue-column');
    const queueConfigSection = document.getElementById('queueConfigSection');

    priorityInput.style.display = 'none';
    queueIdInput.style.display = 'none';
    timeQuantumInput.style.display = 'none';
    queueConfigSection.style.display = 'none';
    priorityColumn.forEach(el => el.style.display = 'none');
    queueColumn.forEach(el => el.style.display = 'none');

    if (this.value.includes('priority')) {
        priorityInput.style.display = 'block';
        priorityColumn.forEach(el => el.style.display = 'table-cell');
    } else if (this.value === 'rr') {
        timeQuantumInput.style.display = 'block';
    } else if (this.value === 'mq' || this.value === 'mlfq') {
        queueConfigSection.style.display = 'block';
        generateQueueInputs();
        if (this.value === 'mq') {
            queueIdInput.style.display = 'block';
            queueColumn.forEach(el => el.style.display = 'table-cell');
        }
    }

    updateProcessTable();
});

function generateQueueInputs() {
    const numQueues = parseInt(document.getElementById('numQueues').value) || 2;
    const container = document.getElementById('queuesContainer');
    container.innerHTML = '';

    for (let i = 0; i < numQueues; i++) {
        const div = document.createElement('div');
        div.className = 'queue-config-item';
        div.innerHTML = `
            <h4>Queue ${i + 1} ${i === 0 ? '(Highest Priority)' : ''}</h4>
            <div class="input-group">
                <label>Algorithm:</label>
                <select class="queue-algo" onchange="toggleQueueQuantum(this)">
                    <option value="fcfs">FCFS</option>
                    <option value="sjf">SJF</option>
                    <option value="rr">Round Robin</option>
                </select>
            </div>
            <div class="input-group queue-quantum" style="display: none;">
                <label>Time Quantum:</label>
                <input type="number" class="queue-quantum-val" value="2" min="1">
            </div>
        `;
        container.appendChild(div);
    }
}

window.toggleQueueQuantum = function (select) {
    const quantumDiv = select.parentElement.nextElementSibling;
    if (select.value === 'rr') {
        quantumDiv.style.display = 'block';
    } else {
        quantumDiv.style.display = 'none';
    }
};

function processInput() {
    const arrivalTimes = document.getElementById('arrivalInput').value.trim().split(/\s+/).map(Number);
    const burstTimes = document.getElementById('burstInput').value.trim().split(/\s+/).map(Number);
    const priorityValues = document.getElementById('algorithm').value.includes('priority') ?
        document.getElementById('priorityValues').value.trim().split(/\s+/).map(Number) : [];
    const queueIdValues = document.getElementById('algorithm').value === 'mq' ?
        document.getElementById('queueIdValues').value.trim().split(/\s+/).map(Number) : [];

    processes = [];
    processCounter = 1;

    if (burstTimes.length !== arrivalTimes.length) {
        alert(`Number of arrival times (${arrivalTimes.length}) and burst times (${burstTimes.length}) must match!`);
        return;
    }

    if (queueIdValues.length > 0 && queueIdValues.length !== arrivalTimes.length) {
        alert(`Number of queue IDs (${queueIdValues.length}) must match number of processes (${arrivalTimes.length})!`);
        return;
    }

    if (arrivalTimes.some(isNaN) || burstTimes.some(isNaN) || burstTimes.some(x => x <= 0)) {
        alert('Invalid input! Please enter valid numbers.');
        return;
    }

    for (let i = 0; i < arrivalTimes.length; i++) {
        processes.push({
            id: processCounter++,
            arrivalTime: arrivalTimes[i],
            burstTime: burstTimes[i],
            remainingTime: burstTimes[i],
            priority: priorityValues[i] || 0,
            queueId: queueIdValues[i] || 1,
            startTime: -1,
            finishTime: -1,
            turnaroundTime: 0,
            waitingTime: 0,
            responseTime: -1
        });
    }

    updateProcessTable();
}

function addProcess() {
    const arrivalTime = parseInt(document.getElementById('arrivalTime').value);
    const burstTime = parseInt(document.getElementById('burstTime').value);
    const priority = parseInt(document.getElementById('priority').value) || 0;

    if (isNaN(arrivalTime) || isNaN(burstTime)) {
        alert('Please enter valid numbers');
        return;
    }

    processes.push({
        id: processCounter++,
        arrivalTime,
        burstTime,
        remainingTime: burstTime,
        priority,
        startTime: -1,
        finishTime: -1,
        turnaroundTime: 0,
        waitingTime: 0,
        responseTime: -1
    });

    updateProcessTable();
    clearInputs();
}

function clearInputs() {
    document.getElementById('arrivalTime').value = '';
    document.getElementById('burstTime').value = '';
}

function updateProcessTable() {
    const tbody = document.getElementById('processTableBody');
    const algorithm = document.getElementById('algorithm').value;
    tbody.innerHTML = '';

    processes.forEach(process => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>P${process.id}</td>
            <td>${process.arrivalTime}</td>
            <td>${process.burstTime}</td>
            ${algorithm.includes('priority') ? `<td class="priority-column">${process.priority}</td>` : ''}
            ${algorithm === 'mq' ? `<td class="queue-column">${process.queueId}</td>` : ''}
        `;
        tbody.appendChild(row);
    });
}

async function calculateScheduling() {
    // window.lastResult = result;
    if (processes.length === 0) {
        alert('Please add processes first');
        return;
    }

    const algorithm = document.getElementById('algorithm').value;
    const algorithmNames = {
        'fcfs': 'First Come First Served (FCFS)',
        'sjf': 'Shortest Job First (Non-preemptive)',
        'srtf': 'Shortest Remaining Time First (Preemptive)',
        'rr': 'Round Robin',
        'priority-np': 'Priority (Non-preemptive)',
        'priority-p': 'Priority (Preemptive)',
        'mq': 'Multiple Queue Scheduling',
        'mlfq': 'Multilevel Feedback Queue Scheduling'
    };

    document.getElementById('currentAlgorithm').textContent = algorithmNames[algorithm];

    let result;

    try {
        switch (algorithm) {
            case 'fcfs':
                result = calculateFCFS(processes);
                break;
            case 'sjf':
                result = calculateSJF(processes);
                break;
            case 'srtf':
                result = calculateSRTF(processes);
                break;
            case 'rr':
                const quantum = parseInt(document.getElementById('timeQuantum').value);
                if (isNaN(quantum) || quantum <= 0) {
                    alert('Please enter a valid Time Quantum for Round Robin.');
                    return;
                }
                result = calculateRR(processes, quantum);
                break;
            case 'priority-np':
                result = calculatePriorityNP(processes);
                break;
            case 'priority-p':
                result = calculatePriorityP(processes);
                break;
            case 'mq':
            case 'mlfq':
                const queueDivs = document.querySelectorAll('.queue-config-item');
                const queuesConfig = Array.from(queueDivs).map(div => ({
                    algorithm: div.querySelector('.queue-algo').value,
                    quantum: parseInt(div.querySelector('.queue-quantum-val').value) || 2
                }));

                if (algorithm === 'mq') {
                    result = calculateMQ(processes, queuesConfig);
                } else {
                    result = calculateMLFQ(processes, queuesConfig);
                }
                break;
            default:
                alert('Please select an algorithm');
                return;
        }

        window.lastResult = result;
        displayResults(result.processes);
        createGanttChart(result.timeline);
        resetSimulation();

    } catch (error) {
        console.error('Error in calculation:', error);
        alert('Error calculating schedule');
    }
}

function displayResults(processQueue) {
    const resultTable = document.getElementById('resultTable');
    let html = '<table><thead><tr><th>Process</th><th>Completion Time</th><th>Turnaround Time</th><th>Waiting Time</th><th>Response Time</th></tr></thead><tbody>';

    processQueue.forEach(process => {
        html += `
            <tr>
                <td>P${process.id}</td>
                <td>${process.finishTime}</td>
                <td>${process.turnaroundTime}</td>
                <td>${process.waitingTime}</td>
                <td>${process.responseTime}</td>
            </tr>
        `;
    });

    const validProcesses = processQueue.filter(p => p.turnaroundTime >= 0);
    const avgTurnaround = validProcesses.length > 0 ?
        (validProcesses.reduce((sum, p) => sum + p.turnaroundTime, 0) / validProcesses.length).toFixed(2) : '0.00';
    const avgWaiting = validProcesses.length > 0 ?
        (validProcesses.reduce((sum, p) => sum + p.waitingTime, 0) / validProcesses.length).toFixed(2) : '0.00';
    const avgResponse = validProcesses.length > 0 ?
        (validProcesses.reduce((sum, p) => sum + p.responseTime, 0) / validProcesses.length).toFixed(2) : '0.00';

    html += `</tbody></table>
        <div class="averages">
            <table class="averages-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Average Time</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Turnaround Time</td>
                        <td>${avgTurnaround}</td>
                    </tr>
                    <tr>
                        <td>Waiting Time</td>
                        <td>${avgWaiting}</td>
                    </tr>
                    <tr>
                        <td>Response Time</td>
                        <td>${avgResponse}</td>
                    </tr>
                </tbody>
            </table>
        </div>`;

    resultTable.innerHTML = html;
}

function createGanttChart(timeline) {
    const ganttChart = document.getElementById('ganttChart');
    ganttChart.innerHTML = '';

    // Check if we have queueIds in timeline (MQ/MLFQ)
    const hasQueues = timeline.some(t => t.queueId !== undefined && t.queueId !== null);

    if (hasQueues) {
        // Multi-row Gantt Chart
        ganttChart.classList.add('multi-row');

        // Find max queue ID to determine rows
        let maxQueueId = 0;
        timeline.forEach(t => {
            if (t.queueId) maxQueueId = Math.max(maxQueueId, t.queueId);
        });
        // Or use the config... but timeline is safer.
        // Actually, let's use the number of queues configured if possible, or just dynamic.
        // Let's assume maxQueueId found is sufficient.

        for (let q = 1; q <= maxQueueId; q++) {
            const row = document.createElement('div');
            row.className = 'gantt-row';
            row.innerHTML = `<div class="gantt-row-label">Queue ${q}</div><div class="gantt-row-bars"></div>`;
            const barsContainer = row.querySelector('.gantt-row-bars');

            // Filter timeline for this queue
            // We need to fill gaps with "Idle" or empty space?
            // Standard Gantt: Time flows x-axis.
            // So we need to render blocks at correct positions.
            // Simple approach: Render blocks relative to total time?
            // Or just flex blocks? Flex blocks only work if we fill ALL time.

            // Let's fill gaps.
            let lastTime = 0;
            const queueEvents = timeline.filter(t => t.queueId === q);

            // We need to sort by start time just in case
            queueEvents.sort((a, b) => a.startTime - b.startTime);

            queueEvents.forEach(block => {
                // Gap?
                if (block.startTime > lastTime) {
                    const gapDiv = document.createElement('div');
                    gapDiv.className = 'gantt-block gap';
                    gapDiv.style.flex = block.startTime - lastTime;
                    barsContainer.appendChild(gapDiv);
                }

                const div = document.createElement('div');
                div.className = 'gantt-block';
                div.style.flex = block.endTime - block.startTime;
                div.style.backgroundColor = `hsl(${(block.processId * 137.5) % 360}, 70%, 70%)`;
                div.innerHTML = `P${block.processId}<br><span style="font-size:0.7em">${block.startTime}-${block.endTime}</span>`;
                barsContainer.appendChild(div);

                lastTime = block.endTime;
            });

            // Add remaining time if needed? No, just flow.
            ganttChart.appendChild(row);
        }
    } else {
        // Single row (Standard)
        ganttChart.classList.remove('multi-row');
        timeline.forEach(block => {
            const div = document.createElement('div');
            div.className = 'gantt-block';

            if (block.processId === 'idle') {
                div.classList.add('idle');
                div.innerHTML = `
                    <div>Idle</div>
                    <div>${block.startTime}-${block.endTime}</div>
                `;
            } else {
                div.style.backgroundColor = `hsl(${(block.processId * 137.5) % 360}, 70%, 70%)`;
                div.innerHTML = `
                    <div>P${block.processId}</div>
                    <div>${block.startTime}-${block.endTime}</div>
                `;
            }

            ganttChart.appendChild(div);
        });
    }

    ganttChart.scrollLeft = 0;
}

function startLiveSimulation() {
    if (window.lastResult) {
        startLiveVisualization(window.lastResult);
    } else {
        alert('Please calculate schedule first');
    }
}