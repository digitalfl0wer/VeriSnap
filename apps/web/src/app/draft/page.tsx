import DraftReceipt from "./receipt";

export default async function DraftPage({ searchParams }: { searchParams: { address?: string } }) {
  const address = searchParams.address ?? "";
  return <DraftReceipt address={address} />;
}

