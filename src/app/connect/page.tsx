import type { Metadata } from "next";
import { McpSnippet } from "@/components/McpEndpoint";
import { SERVER_NAME } from "@/mcp/name";

export const metadata: Metadata = {
  title: "에이전트 연결",
  description: "Claude Code, Cursor 등 MCP를 지원하는 에이전트에 Agentpedia를 연결하는 방법",
};

const cursorConfig = JSON.stringify({ mcpServers: { [SERVER_NAME]: { url: "{url}" } } }, null, 2);

export default function ConnectPage() {
  return (
    <article className="prose-article mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">에이전트에 연결하기</h1>
      <p className="text-muted">
        Agentpedia는 <strong>MCP 서버</strong>를 제공합니다. 연결하면 에이전트가 기사를 검색하고 읽고, 적용 키트를
        받아 내 프로젝트에 바로 적용할 수 있어요. 설치할 것은 없고, 로그인도 필요 없습니다.
      </p>

      <h2>Claude Code</h2>
      <p>터미널에서 한 번만 실행하세요.</p>
      <McpSnippet template={`claude mcp add --transport http ${SERVER_NAME} {url}`} />
      <p>
        그다음 Claude Code 안에서 슬래시 명령으로 기사를 적용합니다. slug는 기사 주소{" "}
        <code>/a/</code> 뒤의 값입니다.
      </p>
      <McpSnippet template={`/mcp__${SERVER_NAME}__apply_article <slug>`} label="Claude Code 안에서" />

      <h2>Cursor</h2>
      <p>
        <code>.cursor/mcp.json</code>(프로젝트) 또는 <code>~/.cursor/mcp.json</code>(전역)에 추가하세요.
      </p>
      <McpSnippet template={cursorConfig} label="mcp.json" />

      <h2>그 밖의 에이전트</h2>
      <p>Streamable HTTP를 지원하는 MCP 클라이언트라면 아래 주소를 등록하면 됩니다.</p>
      <McpSnippet template="{url}" label="엔드포인트" />

      <h2>제공하는 기능</h2>
      <ul>
        <li>
          <code>search_articles</code>: 검색어나 카테고리로 기사를 찾습니다.
        </li>
        <li>
          <code>get_article</code>: 기사의 핵심 아이디어, 본문, 출처를 읽습니다.
        </li>
        <li>
          <code>get_apply_kit</code>: 적용 키트 파일 전체를 받습니다.
        </li>
        <li>
          <code>apply_article</code> (프롬프트): 레포를 먼저 살펴보고, 맞지 않으면 멈추고, 맞으면 계획을 세워 승인을
          받은 뒤 적용합니다.
        </li>
      </ul>
      <p className="text-sm text-muted">모든 기능은 읽기 전용입니다. 에이전트가 내 레포를 바꾸는 것은 항상 내 승인 아래에서 이뤄집니다.</p>
    </article>
  );
}
