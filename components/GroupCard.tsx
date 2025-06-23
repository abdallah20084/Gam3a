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
    <div className="border rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow bg-white">
      {/* يمكنك إضافة صورة الغلاف هنا إذا كانت coverImageUrl متوفرة */}
      {group.coverImageUrl && (
        <img
          src={group.coverImageUrl}
          alt={group.name}
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-6">
        <h3 className="font-bold text-lg mb-2">{group.name}</h3>
        <p className="text-gray-600 mb-4">{group.description}</p>
        <div className="flex flex-wrap justify-between items-center gap-2">
          {/* استخدام group.memberCount بدلاً من group.members.length */}
          <span className="text-sm text-gray-500">{group.memberCount} أعضاء</span>
          
          {/* عرض دور المستخدم الحالي، يمكنك تعديل هذا حسب رغبتك */}
          {group.currentUserRole && group.currentUserRole !== 'none' && (
            <span className="text-sm text-gray-500 ml-2">دوري: {group.currentUserRole}</span>
          )}

          <Link
            // استخدام group.id بدلاً من group._id
            href={`/group/${group.id}`} // تأكد أن المسار في Next.js هو /group/[id] وليس /groups/[id]
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            انضم الآن
          </Link>
        </div>
      </div>
    </div>
  );
}