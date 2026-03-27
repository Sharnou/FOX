import { callWithFailover } from './keyPool.js';
import AILog from '../models/AILog.js';
import fetch from 'node-fetch';

const MAX_REPAIR_TIME_MS = 30 * 60 * 1000; // 30 minutes

export async function requestRepair(problemDescription, adminId) {
  const log = await AILog.create({
    type: 'repair_request',
    problem: problemDescription,
    requestedBy: adminId,
    status: 'pending_approval',
    createdAt: new Date()
  });
  return log;
}

export async function executeRepair(logId) {
  const log = await AILog.findById(logId);
  if (!log || log.status !== 'approved') throw new Error('Not approved');

  log.status = 'running';
  log.startedAt = new Date();
  await log.save();

  const deadline = Date.now() + MAX_REPAIR_TIME_MS;

  try {
    const solution = await callWithFailover(async (key) => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an AI system repair assistant for XTOX marketplace. Analyze the problem and suggest a fix.' },
            { role: 'user', content: `Problem: ${log.problem}\n\nSuggest a solution as actionable steps.` }
          ],
          max_tokens: 500
        })
      });
      return res.json();
    });

    const solutionText = solution.choices[0].message.content;

    log.status = 'completed';
    log.solution = solutionText;
    log.completedAt = new Date();
    log.executedOnce = true;
    await log.save();

    return { success: true, solution: solutionText };
  } catch (err) {
    log.status = 'failed';
    log.error = err.message;
    await log.save();
    return { success: false, error: err.message };
  }
}

export async function approveRepair(logId) {
  await AILog.findByIdAndUpdate(logId, { status: 'approved' });
}
