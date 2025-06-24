import GroupCard from '@/components/GroupCard';
import { getGroups } from '@/lib/actions';

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div className="container py-5">
      <h1 className="fw-bold fs-2 mb-4 text-center">المجموعات</h1>
      
      <div className="mb-4">
        <input 
          type="text" 
          placeholder="ابحث عن مجموعة..." 
          className="form-control form-control-lg rounded-pill"
          dir="rtl"
        />
      </div>
      
      <section className="mb-5">
        <h2 className="fs-4 fw-semibold mb-3">المجموعات المتاحة</h2>
        <div className="row g-4">
          {groups.map(group => (
            <div key={group._id} className="col-12 col-md-6 col-lg-4">
              <GroupCard group={group} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}