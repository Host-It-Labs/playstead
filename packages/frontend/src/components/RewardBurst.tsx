export function RewardBurst() {
  return (
    <span className="reward-burst" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}
