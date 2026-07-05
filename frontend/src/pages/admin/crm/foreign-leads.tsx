import SalesManagerLeadAssignment from './sales-manager-leads';

export default function ForeignLeadsPage() {
  return (
    <SalesManagerLeadAssignment
      foreignOnly
      title="Foreign Leads"
      description="Foreign customers detected from internal notes, ready for assignment."
      totalLabel="foreign leads"
    />
  );
}
