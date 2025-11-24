#include <iostream>
#include <vector>
#include <queue>
#include <algorithm>
#include <iomanip>
#include <string>
#include <limits>
#include <memory>

using namespace std;

// ============================================================================
// PROCESS CLASS
// ============================================================================

class Process {
private:
    int id;
    int arrival_time;
    int burst_time;
    int priority;
    int remaining_time;
    int start_time;
    int finish_time;
    int waiting_time;
    int turnaround_time;
    int completion_time;
    int response_time;
    int queue_id;
    int current_queue_index;
    int time_in_current_queue;
    bool in_queue;

public:
    Process(int id, int arrival, int burst, int prio)
        : id(id), arrival_time(arrival), burst_time(burst), priority(prio), 
          remaining_time(burst), start_time(-1), finish_time(-1), 
          waiting_time(-1), turnaround_time(-1), 
          completion_time(-1), response_time(-1),
          queue_id(1), current_queue_index(0), time_in_current_queue(0), in_queue(false) {}
    
    // Getters
    int getId() const { return id; }
    int getArrivalTime() const { return arrival_time; }
    int getBurstTime() const { return burst_time; }
    int getPriority() const { return priority; }
    int getRemainingTime() const { return remaining_time; }
    int getStartTime() const { return start_time; }
    int getFinishTime() const { return finish_time; }
    int getWaitingTime() const { return waiting_time; }
    int getTurnaroundTime() const { return turnaround_time; }
    int getCompletionTime() const { return completion_time; }
    int getResponseTime() const { return response_time; }
    int getQueueId() const { return queue_id; }
    int getCurrentQueueIndex() const { return current_queue_index; }
    int getTimeInCurrentQueue() const { return time_in_current_queue; }
    bool getInQueue() const { return in_queue; }
    
    // Setters
    void setRemainingTime(int time) { remaining_time = time; }
    void setStartTime(int time) { start_time = time; }
    void setFinishTime(int time) { finish_time = time; }
    void setWaitingTime(int time) { waiting_time = time; }
    void setTurnaroundTime(int time) { turnaround_time = time; }
    void setCompletionTime(int time) { completion_time = time; }
    void setResponseTime(int time) { response_time = time; }
    void setQueueId(int qid) { queue_id = qid; }
    void setCurrentQueueIndex(int idx) { current_queue_index = idx; }
    void setTimeInCurrentQueue(int time) { time_in_current_queue = time; }
    void setInQueue(bool flag) { in_queue = flag; }
};

// ============================================================================
// BASE SCHEDULING ALGORITHM CLASS
// ============================================================================

class SchedulingAlgorithm {
public:
    virtual void schedule(vector<Process>& processes) = 0;
    virtual void printGanttChart() = 0;
    virtual void printMetrics(const vector<Process>& processes);
    virtual ~SchedulingAlgorithm() = default;

protected:
    vector<pair<int, int>> gantt_chart;
};

void SchedulingAlgorithm::printGanttChart() {
    cout << "\nGantt Chart:\n";
    cout << "--------------------------------------------------\n";
    int time = 0;
    for (const auto& segment : gantt_chart) {
        if (segment.first == -1) {
            cout << "| X ";
        } else {
            cout << "| P" << segment.first << " ";
        }
        time += segment.second;
    }
    cout << "|\n--------------------------------------------------\n";

    time = 0;
    for (const auto& segment : gantt_chart) {
        cout << time << "\t";
        time += segment.second;
    }
    cout << time << "\n";
}

void SchedulingAlgorithm::printMetrics(const vector<Process>& processes) {
    double totalTAT = 0, totalWT = 0, totalRT = 0;
    int totalBurstTime = 0, completionTime = 0;

    cout << "\n===================================================================================\n";
    cout << "| Process | Arrival | Burst | Priority | Finish | Turnaround | Waiting | Response |\n";
    cout << "-----------------------------------------------------------------------------------\n";

    for (const auto& process : processes) {
        int tat = process.getFinishTime() - process.getArrivalTime();
        int wt = tat - process.getBurstTime();
        int rt = process.getStartTime() - process.getArrivalTime();

        totalTAT += tat;
        totalWT += wt;
        totalRT += rt;
        totalBurstTime += process.getBurstTime();
        completionTime = max(completionTime, process.getFinishTime());

        cout << "| " << setw(7) << "P" + to_string(process.getId()) 
             << " | " << setw(7) << process.getArrivalTime() 
             << " | " << setw(5) << process.getBurstTime() 
             << " | " << setw(8) << process.getPriority() 
             << " | " << setw(6) << process.getFinishTime() 
             << " | " << setw(10) << tat 
             << " | " << setw(7) << wt 
             << " | " << setw(8) << rt 
             << " |\n";
    }

    cout << "===================================================================================\n";
    cout << "Average Turnaround Time: " << fixed << setprecision(2) << (totalTAT / processes.size()) << "\n";
    cout << "Average Waiting Time: " << fixed << setprecision(2) << (totalWT / processes.size()) << "\n";
    cout << "Average Response Time: " << fixed << setprecision(2) << (totalRT / processes.size()) << "\n";
    cout << "CPU Utilization: " << fixed << setprecision(2) 
         << ((totalBurstTime / (double)completionTime) * 100) << "%\n";
}

// ============================================================================
// FCFS ALGORITHM
// ============================================================================

class FCFS : public SchedulingAlgorithm {
public:
    void schedule(vector<Process>& processes) override {
        gantt_chart.clear();
        int current_time = 0;

        for (auto& process : processes) {
            if (current_time < process.getArrivalTime()) {
                int idle_time = process.getArrivalTime() - current_time;
                gantt_chart.push_back({-1, idle_time});
                current_time = process.getArrivalTime();
            }

            process.setStartTime(current_time);
            current_time += process.getBurstTime();
            process.setFinishTime(current_time);
            process.setTurnaroundTime(process.getFinishTime() - process.getArrivalTime());
            process.setWaitingTime(process.getStartTime() - process.getArrivalTime());

            gantt_chart.push_back({process.getId(), process.getBurstTime()});
        }
    }

    void printGanttChart() override {
        SchedulingAlgorithm::printGanttChart();
    }

    void printMetrics(const vector<Process>& processes) override {
        SchedulingAlgorithm::printMetrics(processes);
    }
};

// ============================================================================
// SJF ALGORITHM
// ============================================================================

class SJF : public SchedulingAlgorithm {
public:
    void schedule(vector<Process>& processes) override {
        gantt_chart.clear();
        sort(processes.begin(), processes.end(), [](const Process& a, const Process& b) {
            return a.getBurstTime() < b.getBurstTime();
        });

        int current_time = 0;
        for (auto& process : processes) {
            if (current_time < process.getArrivalTime()) {
                int idle_time = process.getArrivalTime() - current_time;
                gantt_chart.push_back({-1, idle_time});
                current_time = process.getArrivalTime();
            }

            process.setStartTime(current_time);
            current_time += process.getBurstTime();
            process.setFinishTime(current_time);
            process.setTurnaroundTime(process.getFinishTime() - process.getArrivalTime());
            process.setWaitingTime(process.getStartTime() - process.getArrivalTime());

            gantt_chart.push_back({process.getId(), process.getBurstTime()});
        }
    }

    void printGanttChart() override {
        SchedulingAlgorithm::printGanttChart();
    }

    void printMetrics(const vector<Process>& processes) override {
        SchedulingAlgorithm::printMetrics(processes);
    }
};

// ============================================================================
// SRTF (Preemptive SJF) ALGORITHM
// ============================================================================

class PreemptiveSJF : public SchedulingAlgorithm {
public:
    void schedule(vector<Process>& processes) override {
        gantt_chart.clear();
        sort(processes.begin(), processes.end(), [](const Process& a, const Process& b) {
            return a.getArrivalTime() < b.getArrivalTime();
        });

        auto cmp = [](Process* a, Process* b) { return a->getRemainingTime() > b->getRemainingTime(); };
        priority_queue<Process*, vector<Process*>, decltype(cmp)> ready_queue(cmp);

        int current_time = 0, completed = 0;
        size_t idx = 0;

        while (completed < processes.size()) {
            while (idx < processes.size() && processes[idx].getArrivalTime() <= current_time) {
                ready_queue.push(&processes[idx]);
                idx++;
            }

            if (!ready_queue.empty()) {
                Process* proc = ready_queue.top();
                ready_queue.pop();
                
                if (proc->getStartTime() == -1) {
                    proc->setStartTime(current_time);
                }
                
                proc->setRemainingTime(proc->getRemainingTime() - 1);
                gantt_chart.push_back({proc->getId(), 1});
                current_time++;

                if (proc->getRemainingTime() == 0) {
                    proc->setFinishTime(current_time);
                    proc->setTurnaroundTime(proc->getFinishTime() - proc->getArrivalTime());
                    proc->setWaitingTime(proc->getTurnaroundTime() - proc->getBurstTime());
                    completed++;
                } else {
                    ready_queue.push(proc);
                }
            } else {
                gantt_chart.push_back({-1, 1});
                current_time++;
            }
        }
    }

    void printGanttChart() override {
        SchedulingAlgorithm::printGanttChart();
    }

    void printMetrics(const vector<Process>& processes) override {
        SchedulingAlgorithm::printMetrics(processes);
    }
};

// ============================================================================
// PRIORITY SCHEDULING ALGORITHMS
// ============================================================================

class PriorityScheduling : public SchedulingAlgorithm {
public:
    void schedule(vector<Process>& processes) override {
        gantt_chart.clear();
        sort(processes.begin(), processes.end(), [](const Process& a, const Process& b) {
            return a.getPriority() < b.getPriority();
        });

        int current_time = 0;
        for (auto& process : processes) {
            if (current_time < process.getArrivalTime()) {
                int idle_time = process.getArrivalTime() - current_time;
                gantt_chart.push_back({-1, idle_time});
                current_time = process.getArrivalTime();
            }

            process.setStartTime(current_time);
            current_time += process.getBurstTime();
            process.setFinishTime(current_time);
            process.setTurnaroundTime(process.getFinishTime() - process.getArrivalTime());
            process.setWaitingTime(process.getStartTime() - process.getArrivalTime());

            gantt_chart.push_back({process.getId(), process.getBurstTime()});
        }
    }

    void printGanttChart() override {
        SchedulingAlgorithm::printGanttChart();
    }

    void printMetrics(const vector<Process>& processes) override {
        SchedulingAlgorithm::printMetrics(processes);
    }
};

class PreemptivePriorityScheduling : public SchedulingAlgorithm {
public:
    void schedule(vector<Process>& processes) override {
        gantt_chart.clear();
        sort(processes.begin(), processes.end(), [](const Process& a, const Process& b) {
            return a.getArrivalTime() < b.getArrivalTime();
        });

        auto cmp = [](Process* a, Process* b) { return a->getPriority() > b->getPriority(); };
        priority_queue<Process*, vector<Process*>, decltype(cmp)> ready_queue(cmp);

        int current_time = 0, completed = 0;
        size_t idx = 0;

        while (completed < processes.size()) {
            while (idx < processes.size() && processes[idx].getArrivalTime() <= current_time) {
                ready_queue.push(&processes[idx]);
                idx++;
            }

            if (!ready_queue.empty()) {
                Process* proc = ready_queue.top();
                ready_queue.pop();
                
                if (proc->getStartTime() == -1) {
                    proc->setStartTime(current_time);
                }
                
                proc->setRemainingTime(proc->getRemainingTime() - 1);
                gantt_chart.push_back({proc->getId(), 1});
                current_time++;

                if (proc->getRemainingTime() == 0) {
                    proc->setFinishTime(current_time);
                    proc->setTurnaroundTime(proc->getFinishTime() - proc->getArrivalTime());
                    proc->setWaitingTime(proc->getTurnaroundTime() - proc->getBurstTime());
                    completed++;
                } else {
                    ready_queue.push(proc);
                }
            } else {
                gantt_chart.push_back({-1, 1});
                current_time++;
            }
        }
    }

    void printGanttChart() override {
        SchedulingAlgorithm::printGanttChart();
    }

    void printMetrics(const vector<Process>& processes) override {
        SchedulingAlgorithm::printMetrics(processes);
    }
};

// ============================================================================
// ROUND ROBIN ALGORITHM
// ============================================================================

class RoundRobin : public SchedulingAlgorithm {
private:
    int time_quantum;
    
public:
    explicit RoundRobin(int tq) : time_quantum(tq) {}
    
    void schedule(vector<Process>& processes) override {
        gantt_chart.clear();
        queue<Process*> ready_queue;
        int current_time = 0;

        for (auto& process : processes) {
            process.setRemainingTime(process.getBurstTime());
        }

        size_t idx = 0;
        while (idx < processes.size() || !ready_queue.empty()) {
            while (idx < processes.size() && processes[idx].getArrivalTime() <= current_time) {
                ready_queue.push(&processes[idx]);
                idx++;
            }

            if (!ready_queue.empty()) {
                Process* proc = ready_queue.front();
                ready_queue.pop();
                
                if (proc->getStartTime() == -1) {
                    proc->setStartTime(current_time);
                }
                
                int exec_time = min(time_quantum, proc->getRemainingTime());
                gantt_chart.push_back({proc->getId(), exec_time});
                current_time += exec_time;
                proc->setRemainingTime(proc->getRemainingTime() - exec_time);

                while (idx < processes.size() && processes[idx].getArrivalTime() <= current_time) {
                    ready_queue.push(&processes[idx]);
                    idx++;
                }

                if (proc->getRemainingTime() > 0) {
                    ready_queue.push(proc);
                } else {
                    proc->setFinishTime(current_time);
                    proc->setTurnaroundTime(proc->getFinishTime() - proc->getArrivalTime());
                    proc->setWaitingTime(proc->getTurnaroundTime() - proc->getBurstTime());
                }
            } else {
                gantt_chart.push_back({-1, 1});
                current_time++;
            }
        }
    }

    void printGanttChart() override {
        SchedulingAlgorithm::printGanttChart();
    }
};

// ============================================================================
// MULTILEVEL QUEUE ALGORITHM
// ============================================================================

struct QueueConfig {
    string algorithm;
    int quantum;
    
    QueueConfig(const string& algo = "fcfs", int q = 0) 
        : algorithm(algo), quantum(q) {}
};

class MultilevelQueue : public SchedulingAlgorithm {
private:
    vector<QueueConfig> queue_configs;
    int num_queues;
    
public:
    MultilevelQueue(const vector<QueueConfig>& configs) 
        : queue_configs(configs), num_queues(configs.size()) {}
    
    void schedule(vector<Process>& processes) override {
        gantt_chart.clear();
        vector<vector<Process*>> queues(num_queues);
        
        for (auto& process : processes) {
            int qid = process.getQueueId();
            int queue_index = qid - 1;
            
            if (queue_index >= num_queues) queue_index = num_queues - 1;
            else if (queue_index < 0) queue_index = 0;
            
            queues[queue_index].push_back(&process);
        }
        
        for (auto& queue : queues) {
            sort(queue.begin(), queue.end(), [](Process* a, Process* b) {
                return a->getArrivalTime() < b->getArrivalTime();
            });
        }
        
        int current_time = 0;
        size_t completed = 0;
        
        while (completed < processes.size()) {
            bool process_executed = false;
            
            for (int i = 0; i < num_queues; i++) {
                auto& current_queue = queues[i];
                auto& config = queue_configs[i];
                
                vector<Process*> available;
                for (auto* proc : current_queue) {
                    if (proc->getArrivalTime() <= current_time && proc->getRemainingTime() > 0) {
                        available.push_back(proc);
                    }
                }
                
                if (available.empty()) continue;
                
                Process* selected = available[0];
                
                if (selected->getStartTime() == -1) {
                    selected->setStartTime(current_time);
                }
                
                int run_time = 0;
                if (config.algorithm == "rr") {
                    run_time = min(selected->getRemainingTime(), config.quantum);
                } else if (config.algorithm == "srtf") {
                    run_time = 1;
                } else {
                    run_time = selected->getRemainingTime();
                }
                
                selected->setRemainingTime(selected->getRemainingTime() - run_time);
                current_time += run_time;
                gantt_chart.push_back({selected->getId(), run_time});
                
                if (selected->getRemainingTime() == 0) {
                    selected->setFinishTime(current_time);
                    selected->setTurnaroundTime(selected->getFinishTime() - selected->getArrivalTime());
                    selected->setWaitingTime(selected->getTurnaroundTime() - selected->getBurstTime());
                    completed++;
                }
                
                process_executed = true;
                break;
            }
            
            if (!process_executed) {
                int next_arrival = numeric_limits<int>::max();
                for (const auto& queue : queues) {
                    for (const auto* proc : queue) {
                        if (proc->getRemainingTime() > 0 && proc->getArrivalTime() > current_time) {
                            next_arrival = min(next_arrival, proc->getArrivalTime());
                        }
                    }
                }
                if (next_arrival == numeric_limits<int>::max()) break;
                int idle_time = next_arrival - current_time;
                gantt_chart.push_back({-1, idle_time});
                current_time = next_arrival;
            }
        }
    }

    void printGanttChart() override {
        SchedulingAlgorithm::printGanttChart();
    }

    void printMetrics(const vector<Process>& processes) override {
        SchedulingAlgorithm::printMetrics(processes);
    }
};

// ============================================================================
// MLFQ ALGORITHM
// ============================================================================

struct MLFQConfig {
    int quantum;
    MLFQConfig(int q = 2) : quantum(q) {}
};

class MLFQ : public SchedulingAlgorithm {
private:
    vector<MLFQConfig> queue_configs;
    int num_queues;
    
public:
    MLFQ(const vector<MLFQConfig>& configs) 
        : queue_configs(configs), num_queues(configs.size()) {}
    
    void schedule(vector<Process>& processes) override {
        gantt_chart.clear();
        vector<vector<Process*>> queues(num_queues);
        
        for (auto& process : processes) {
            process.setCurrentQueueIndex(0);
            process.setTimeInCurrentQueue(0);
            process.setInQueue(false);
            process.setRemainingTime(process.getBurstTime());
        }
        
        int current_time = 0;
        size_t completed = 0;
        
        while (completed < processes.size()) {
            for (auto& proc : processes) {
                if (proc.getArrivalTime() <= current_time && 
                    proc.getRemainingTime() > 0 && 
                    !proc.getInQueue()) {
                    queues[0].push_back(&proc);
                    proc.setInQueue(true);
                    proc.setCurrentQueueIndex(0);
                }
            }
            
            int active_queue_index = -1;
            for (int i = 0; i < num_queues; i++) {
                if (!queues[i].empty()) {
                    active_queue_index = i;
                    break;
                }
            }
            
            if (active_queue_index == -1) {
                int next_arrival = numeric_limits<int>::max();
                for (auto& proc : processes) {
                    if (proc.getRemainingTime() > 0 && proc.getArrivalTime() > current_time) {
                        next_arrival = min(next_arrival, proc.getArrivalTime());
                    }
                }
                if (next_arrival == numeric_limits<int>::max()) break;
                int idle_time = next_arrival - current_time;
                gantt_chart.push_back({-1, idle_time});
                current_time = next_arrival;
                continue;
            }
            
            auto& current_queue = queues[active_queue_index];
            auto& config = queue_configs[active_queue_index];
            Process* process = current_queue[0];
            
            if (process->getStartTime() == -1) {
                process->setStartTime(current_time);
            }
            
            process->setRemainingTime(process->getRemainingTime() - 1);
            process->setTimeInCurrentQueue(process->getTimeInCurrentQueue() + 1);
            current_time++;
            
            if (!gantt_chart.empty() && gantt_chart.back().first == process->getId()) {
                gantt_chart.back().second++;
            } else {
                gantt_chart.push_back({process->getId(), 1});
            }
            
            if (process->getRemainingTime() == 0) {
                process->setFinishTime(current_time);
                process->setTurnaroundTime(process->getFinishTime() - process->getArrivalTime());
                process->setWaitingTime(process->getTurnaroundTime() - process->getBurstTime());
                current_queue.erase(current_queue.begin());
                completed++;
            } else if (process->getTimeInCurrentQueue() >= config.quantum) {
                current_queue.erase(current_queue.begin());
                process->setTimeInCurrentQueue(0);
                
                int next_queue_idx = active_queue_index + 1;
                if (next_queue_idx >= num_queues) next_queue_idx = num_queues - 1;
                
                process->setCurrentQueueIndex(next_queue_idx);
                queues[next_queue_idx].push_back(process);
            }
        }
    }

    void printGanttChart() override {
        SchedulingAlgorithm::printGanttChart();
    }

    void printMetrics(const vector<Process>& processes) override {
        SchedulingAlgorithm::printMetrics(processes);
    }
};

// ============================================================================
// MAIN PROGRAM
// ============================================================================

int main() {
    int num_processes;
    cout << "Enter the number of processes: ";
    cin >> num_processes;

    if (num_processes <= 0) {
        cerr << "Invalid number of processes! Exiting...\n";
        return 1;
    }

    cout << "\nChoose scheduling algorithm:\n";
    cout << "1. FCFS\n2. SJF\n3. Preemptive SJF (SRTF)\n4. Priority Scheduling\n";
    cout << "5. Preemptive Priority Scheduling\n6. Round Robin\n";
    cout << "7. Multilevel Queue (MQ)\n8. Multilevel Feedback Queue (MLFQ)\n";
    cout << "Choice: ";
    
    int choice;
    cin >> choice;

    bool is_priority_scheduling = (choice == 4 || choice == 5);
    bool is_multilevel_queue = (choice == 7);

    vector<Process> processes;
    for (int i = 0; i < num_processes; i++) {
        int arrival, burst, prio = 0, qid = 1;

        cout << "\nProcess " << i + 1 << ":\n";
        
        cout << "Arrival Time: ";
        cin >> arrival;
        
        cout << "Burst Time: ";
        cin >> burst;

        if (is_priority_scheduling) {
            cout << "Priority: ";
            cin >> prio;
        }

        if (is_multilevel_queue) {
            cout << "Queue ID (1, 2, 3, ...): ";
            cin >> qid;
        }

        Process proc(i + 1, arrival, burst, prio);
        if (is_multilevel_queue) {
            proc.setQueueId(qid);
        }
        processes.push_back(proc);
    }

    unique_ptr<SchedulingAlgorithm> scheduler;

    switch (choice) {
        case 1: scheduler = make_unique<FCFS>(); break;
        case 2: scheduler = make_unique<SJF>(); break;
        case 3: scheduler = make_unique<PreemptiveSJF>(); break;
        case 4: scheduler = make_unique<PriorityScheduling>(); break;
        case 5: scheduler = make_unique<PreemptivePriorityScheduling>(); break;
        case 6: {
            int tq;
            cout << "Enter time quantum: ";
            cin >> tq;
            scheduler = make_unique<RoundRobin>(tq);
            break;
        }
        case 7: {
            int num_queues;
            cout << "Enter number of queues: ";
            cin >> num_queues;
            
            vector<QueueConfig> configs;
            for (int i = 0; i < num_queues; i++) {
                string algo;
                int quantum = 0;
                
                cout << "\nQueue " << (i + 1) << " algorithm (fcfs/sjf/srtf/rr): ";
                cin >> algo;
                
                if (algo == "rr") {
                    cout << "Time quantum: ";
                    cin >> quantum;
                }
                
                configs.push_back(QueueConfig(algo, quantum));
            }
            
            scheduler = make_unique<MultilevelQueue>(configs);
            break;
        }
        case 8: {
            int num_queues;
            cout << "Enter number of queue levels: ";
            cin >> num_queues;
            
            vector<MLFQConfig> configs;
            for (int i = 0; i < num_queues; i++) {
                int quantum;
                cout << "Queue " << (i + 1) << " time quantum: ";
                cin >> quantum;
                configs.push_back(MLFQConfig(quantum));
            }
            
            scheduler = make_unique<MLFQ>(configs);
            break;
        }
        default:
            cerr << "Invalid choice! Exiting...\n";
            return 1;
    }

    scheduler->schedule(processes);
    scheduler->printGanttChart();
    scheduler->printMetrics(processes);
    
    cout << "\nPress Enter to exit...";
    cin.ignore();
    cin.get();
    
    return 0;
}
