import { Honeypot } from "@/components/survey/Honeypot";
import { MAX_OTHER_LENGTH } from "@/survey/limits";
import { agentAppOptions, modelOptions, TENURE_OPTIONS, USE_OPTIONS, type SurveyOption } from "@/survey/options";

const choice = "flex items-start gap-2.5 text-sm leading-6";
const box = "mt-1 size-4 shrink-0 accent-foreground";
const otherField =
  "mt-2 w-full rounded-xl bg-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20";

function Checks({
  name,
  options,
  otherName,
  otherAria,
}: {
  name: string;
  options: readonly SurveyOption[];
  otherName: string;
  otherAria: string;
}) {
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <li key={option.id}>
          <label className={choice}>
            <input className={box} type="checkbox" name={name} value={option.id} />
            <span>{option.label}</span>
          </label>
        </li>
      ))}
      <li className="sm:col-span-2">
        <label className={choice}>
          <input className={box} type="checkbox" name={name} value="other" />
          <span>기타</span>
        </label>
        <input
          className={otherField}
          type="text"
          name={otherName}
          maxLength={MAX_OTHER_LENGTH}
          placeholder="직접 입력"
          aria-label={otherAria}
          autoComplete="off"
        />
      </li>
    </ul>
  );
}

/** Native form. It posts without JavaScript; the done cookie hides it on the next load. */
export function SurveyForm() {
  const agents = agentAppOptions();
  const models = modelOptions();
  return (
    <form action="/api/survey" method="post" className="survey-form mt-8">
      <Honeypot />
      <fieldset>
        <legend className="text-base font-semibold tracking-tight">주로 쓰는 에이전트 앱</legend>
        <p className="mt-1 text-sm text-muted">여러 개 고를 수 있습니다.</p>
        <Checks name="agents" options={agents} otherName="agentOther" otherAria="기타 에이전트" />
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold tracking-tight">선호 모델</legend>
        <p className="mt-1 text-sm text-muted">하나만 고릅니다.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {models.map((option, index) => (
            <li key={option.id}>
              <label className={choice}>
                <input
                  className={box}
                  type="radio"
                  name="model"
                  value={option.id}
                  required={index === 0}
                />
                <span>{option.label}</span>
              </label>
            </li>
          ))}
          <li className="sm:col-span-2">
            <label className={choice}>
              <input className={box} type="radio" name="model" value="other" />
              <span>기타</span>
            </label>
            <input
              className={otherField}
              type="text"
              name="modelOther"
              maxLength={MAX_OTHER_LENGTH}
              placeholder="직접 입력"
              aria-label="기타 모델"
              autoComplete="off"
            />
          </li>
        </ul>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold tracking-tight">주 용도</legend>
        <p className="mt-1 text-sm text-muted">여러 개 고를 수 있습니다.</p>
        <Checks name="uses" options={USE_OPTIONS} otherName="useOther" otherAria="기타 용도" />
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold tracking-tight">에이전트 사용 기간</legend>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {TENURE_OPTIONS.map((option, index) => (
            <li key={option.id}>
              <label className={choice}>
                <input
                  className={box}
                  type="radio"
                  name="tenure"
                  value={option.id}
                  required={index === 0}
                />
                <span>{option.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <button
        type="submit"
        className="mt-8 inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-85"
      >
        응답 보내기
      </button>
    </form>
  );
}
