'use client';

import { Card, Button } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';

interface Group {
  _id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  memberCount: number;
}

interface GroupCardProps {
  group: Group;
}

export default function GroupCard({ group }: GroupCardProps) {
  const defaultCoverImage = '/images/default-group-cover.jpg';
  
  return (
    <Card className="h-100 shadow-sm">
      <div style={{ position: 'relative', width: '100%', height: '160px' }}>
        <Image
          src={group.coverImageUrl || defaultCoverImage}
          alt={group.name}
          fill
          style={{ objectFit: 'cover' }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <Card.Body>
        <Card.Title className="fw-bold">{group.name}</Card.Title>
        <Card.Text>
          {group.description ? (
            group.description.length > 100 
              ? `${group.description.substring(0, 100)}...` 
              : group.description
          ) : (
            'لا يوجد وصف لهذه المجموعة'
          )}
        </Card.Text>
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">{group.memberCount && group.memberCount > 0 ? group.memberCount : 1} أعضاء</small>
          <Link href={`/group/${group._id}`} passHref legacyBehavior>
            <Button variant="outline-primary" size="sm">
              عرض المجموعة
            </Button>
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}
