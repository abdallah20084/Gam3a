import { useRouter } from 'next/navigation';

const GroupEditPage = () => {
  const router = useRouter();

  return (
    <div>
      {/* ... existing code ... */}
      <button onClick={() => router.push(`/groups/${groupId}`)}>Edit Group</button>
      {/* ... existing code ... */}
    </div>
  );
};

export default GroupEditPage; 