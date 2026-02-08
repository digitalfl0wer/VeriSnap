import TxReceiptView from "./view";

export default function ReceiptPage({ params }: { params: { txHash: string } }) {
  return <TxReceiptView txHash={params.txHash} />;
}

