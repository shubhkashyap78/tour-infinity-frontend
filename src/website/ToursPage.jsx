import ListingPage from "./ListingPage";

export default function ToursPage() {
  return (
    <ListingPage
      type="tour"
      title="Sea Activities"
      icon="🌊"
      heroImg="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&q=80"
      heroTagline="Snorkelling, diving, kayaking and thrilling water adventures in Mauritius."
      emptyMsg="No sea activities listed yet — check back soon!"
    />
  );
}
