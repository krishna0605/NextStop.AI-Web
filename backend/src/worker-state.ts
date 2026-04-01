type WorkerState = {
  workerReady: boolean;
  lastWorkerHeartbeatAt: string | null;
  lastJobName: string | null;
  lastAiJobId: string | null;
  directExecution: boolean;
};

const workerState: WorkerState = {
  workerReady: false,
  lastWorkerHeartbeatAt: null,
  lastJobName: null,
  lastAiJobId: null,
  directExecution: true,
};

function heartbeat(jobName: string | null, aiJobId: string | null) {
  workerState.lastWorkerHeartbeatAt = new Date().toISOString();
  workerState.lastJobName = jobName;
  workerState.lastAiJobId = aiJobId;
}

export function markWorkerReady() {
  workerState.workerReady = true;
  heartbeat(null, null);
}

export function markWorkerActivity(jobName: string, aiJobId?: string | null) {
  workerState.workerReady = true;
  heartbeat(jobName, aiJobId ?? null);
}

export function getWorkerState() {
  return { ...workerState };
}
