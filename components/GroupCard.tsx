import Link from 'next/link';

// تعريف الواجهة لـ props group لضمان Type Safety
interface GroupCardProps {
  group: {
    id: string; // تم تعديلها لتطابق 'id' التي تأتي من الـ API بدلاً من '_id'
    name: string;
    description: string;
    coverImageUrl?: string | null; // إذا كان يمكن أن يكون null
    memberCount: number; // تم تعديلها لتطابق 'memberCount' من الـ API
    currentUserRole: string; // لإظهار دور المستخدم إذا كنت تريد عرضه في البطاقة
    // يمكنك إضافة حقول أخرى هنا حسب ما يرجع من الـ API
  };
}

export default function GroupCard({ group }: GroupCardProps) {
  return (
    <div className="card h-100 shadow-sm">
      {group.coverImageUrl ? (
        <img
          src={group.coverImageUrl}
          alt={group.name}
          className="card-img-top"
          style={{ height: 130, objectFit: 'cover' }}
        />
      ) : (
        <div
          className="card-img-top bg-secondary d-flex align-items-center justify-content-center text-white"
          style={{ height: 130 }}
        >
          لا يوجد صورة غلاف
        </div>
      )}
      <div className="card-body">
        <h5 className="card-title text-end">{group.name}</h5>
        <p className="card-text text-end text-muted small mb-2">{group.description}</p>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span className="text-muted small">{group.memberCount} أعضاء</span>
          {group.currentUserRole && group.currentUserRole !== 'none' && (
            <span className="badge bg-info text-dark ms-2">دوري: {group.currentUserRole}</span>
          )}
        </div>
      </div>
      <div className="card-footer bg-white border-0 d-flex justify-content-end">
        <Link
          href={`/group/${group.id}`}
          className="btn btn-primary btn-sm"
        >
          انضم الآن
        </Link>
      </div>
    </div>
  );
}