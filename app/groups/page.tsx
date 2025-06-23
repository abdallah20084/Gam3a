import GroupCard from '@/components/GroupCard';
import { getGroups } from '@/lib/actions';

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">المجموعات</h1>
      
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="ابحث عن مجموعة..." 
          className="w-full p-3 border rounded-lg"
          dir="rtl"
        />
      </div>
      
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">المجموعات المتاحة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <GroupCard key={group._id} group={group} />
          ))}
        </div>
      </section>
    </div>
  );
}