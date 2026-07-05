import TelephonyOrderAssignmentPage from './order-assignment';

export default function TelephonyForeignAssignmentPage() {
  return (
    <TelephonyOrderAssignmentPage
      foreignOnly
      title="Foreign Customers"
      description="Orders assigned to you for foreign customer follow-up."
      empty="No assigned foreign customers found."
    />
  );
}
