import styles from "./reserve.module.css";

type ReserveStepNavProps = {
  activeStep: 1 | 2 | 3 | 4;
};

const STEPS = [
  { id: 1 as const, single: "1. メニュー" },
  { id: 2 as const, single: "2. カート" },
  { id: 3 as const, single: "3. 日時" },
  { id: 4 as const, single: "4. お客様情報", multiPrimary: "4. お客様", multiSecondary: "情報" },
];

export default function ReserveStepNav({ activeStep }: ReserveStepNavProps) {
  return (
    <div className={styles.stepNav}>
      {STEPS.map((step) => (
        <div
          key={step.id}
          className={styles.stepItem}
          data-active={step.id === activeStep ? "true" : undefined}
          data-step={String(step.id)}
        >
          <span className={styles.stepSingleLine}>{step.single}</span>
          {step.multiPrimary && step.multiSecondary ? (
            <span className={styles.stepMultiLine}>
              <span>{step.multiPrimary}</span>
              <span>{step.multiSecondary}</span>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
