import Navbar from "@/components/Navbar";
import PageHero from "@/components/PageHero";

export default function PeoplePage() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <PageHero page="people" />
    </div>
  );
}
