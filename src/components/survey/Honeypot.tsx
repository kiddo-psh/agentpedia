/** Off-screen field. Browsers still submit it; people who tab through the form do not land on it. */
export function Honeypot() {
  return (
    <div className="survey-hp" aria-hidden="true">
      <label>
        회사
        <input type="text" name="survey_hp" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
