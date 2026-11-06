"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Krw } from "@/components/Power";
import { Failure, Loading } from "@/components/Status";
import { api, useApi, useSubmit } from "@/lib/api";
import { MODELS, recommendationPlan, recommendationTypeLabel, SOURCE_LABEL } from "@/lib/format";
import type { Consultation, Recommendation } from "@/lib/types";

const PERMISSIONS = [
  { label: "읽기 명령", rule: "상태 확인은 묻지 않고 실행합니다." },
  { label: "일반 조치", rule: "묻지 않고 실행하며, 되돌리는 명령을 함께 기록합니다." },
  { label: "관리자 권한", rule: "실행 전에 화면에서 허용을 눌러야 합니다." },
  { label: "금지 명령", rule: "삭제나 방화벽 변경 같은 위험한 명령은 차단합니다." },
];

export default function RecommendationPage() {
  const { id, recommendationId } = useParams<{ id: string; recommendationId: string }>();
  const router = useRouter();
  const { data, error, reload } = useApi<Recommendation[]>(`/api/servers/${id}/recommendations`);
  const history = useApi<Consultation[]>(`/api/servers/${id}/consultations`);
  const { busy, error: startError, run } = useSubmit();

  if (error) return <Failure error={error} retry={reload} />;
  if (!data) return <Loading />;

  const item = data.find((entry) => entry.id === Number(recommendationId));
  if (!item) return <p className="status">이 추천을 찾을 수 없습니다.</p>;

  const execute = () =>
    run(async () => {
      const created = await api<Consultation>(`/api/recommendations/${item.id}/execute`, { method: "POST" });
      router.push(`/consultations/${created.id}`);
    });

  const latest = history.data?.toSorted((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))[0];
  const model = MODELS.find((option) => option.value === latest?.model)?.label ?? MODELS[0].label;
  const title = recommendationTypeLabel(item.type);

  return (
    <div className="console plan">
      <title>{`${title} · Green Server`}</title>
      <div className="page-head">
        <div>
          <p className="crumb">
            <Link href={`/servers/${id}`}>서버로 돌아가기</Link>
          </p>
          <h1>{title}</h1>
        </div>
        {item.estSavingKrw > 0 && (
          <p className="plan-saving">
            <span className="caption">예상 절약</span>
            <Krw value={item.estSavingKrw} />
          </p>
        )}
      </div>

      <section aria-labelledby="why-heading" className="pane">
        <div className="pane-head">
          <h2 id="why-heading">{SOURCE_LABEL[item.source]} 추천 내용</h2>
        </div>
        <p className="plan-detail">{item.detail}</p>
      </section>

      <div className="console-grid">
        <section aria-labelledby="steps-heading" className="pane">
          <div className="pane-head">
            <h2 id="steps-heading">적용 순서</h2>
          </div>
          <ol className="plan-steps">
            {recommendationPlan(item.type).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="caption plan-note">{model}가 서버 상태를 본 뒤 실제 명령을 정합니다. 그래서 순서는 달라질 수 있고, 실행되는 명령은 모두 다음 화면에 그대로 나타납니다.</p>
        </section>

        <section aria-labelledby="rules-heading" className="pane">
          <div className="pane-head">
            <h2 id="rules-heading">실행 권한</h2>
          </div>
          <dl className="plan-rules">
            {PERMISSIONS.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.rule}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {startError && (
        <p className="error" role="alert">
          {startError}
        </p>
      )}
      {item.status === "open" ? (
        <div className="approval-actions">
          <button type="button" className="button button-primary" onClick={execute} disabled={busy}>
            적용해주세요
          </button>
          <Link href={`/servers/${id}`} className="button">
            취소
          </Link>
        </div>
      ) : (
        <p className="status">이미 처리한 추천입니다.</p>
      )}
    </div>
  );
}
