import { OTHER_ID } from "./limits";

export type SurveyOption = { id: string; label: string };

export type AgentGroup = {
  id: string;
  label: string;
  options: readonly SurveyOption[];
};

/** Free-text row inside the orchestrator group. Stored with the other free-text answers. */
export const ORCHESTRATOR_OTHER_ID = "orchestrator-other";

/**
 * Question 1, in the order the form shows. Labels are the names people pick
 * in the survey. Cursor matches the catalog name; Claude Code and Codex are
 * split into the CLI and the desktop app, which the catalog does not separate.
 */
export const AGENT_GROUPS: readonly AgentGroup[] = [
  {
    id: "cli",
    label: "터미널 CLI",
    options: [
      { id: "claude-code-cli", label: "Claude Code CLI" },
      { id: "codex-cli", label: "Codex CLI" },
      { id: "gemini-cli", label: "Gemini CLI" },
    ],
  },
  {
    id: "desktop",
    label: "데스크톱·웹 에이전트 앱",
    options: [
      { id: "claude-code-app", label: "Claude Code 앱" },
      { id: "codex-app", label: "Codex 앱" },
    ],
  },
  {
    id: "ide",
    label: "IDE·에디터",
    options: [
      { id: "cursor", label: "Cursor" },
      { id: "github-copilot", label: "GitHub Copilot" },
    ],
  },
  {
    id: "orchestrator",
    label: "오케스트레이터",
    options: [
      { id: "orca", label: "Orca" },
      { id: ORCHESTRATOR_OTHER_ID, label: "기타 오케스트레이터" },
    ],
  },
  {
    id: "assistant",
    label: "개인 비서형 에이전트",
    options: [{ id: "grok-bot", label: "Grok Bot" }],
  },
  {
    id: "other",
    label: "기타",
    options: [{ id: OTHER_ID, label: "기타" }],
  },
];

export const USE_OPTIONS: readonly SurveyOption[] = [
  { id: "web", label: "웹 프론트" },
  { id: "backend", label: "백엔드" },
  { id: "data-ai", label: "데이터/AI" },
  { id: "study", label: "학습/과제" },
];

export const TENURE_OPTIONS: readonly SurveyOption[] = [
  { id: "lt-1m", label: "1개월 미만" },
  { id: "1-6m", label: "1-6개월" },
  { id: "6m-plus", label: "6개월+" },
];

export function agentAppOptions(): SurveyOption[] {
  return AGENT_GROUPS.flatMap((group) => [...group.options]);
}
