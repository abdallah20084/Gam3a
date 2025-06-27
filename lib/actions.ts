// lib/actions.ts
import Group from '@/models/Group';
import Message from '@/models/Message';
import User from '@/models/User';
import GroupMember from '@/models/GroupMember';
import { dbConnect } from './db';
import mongoose from 'mongoose';

// وظائف المجموعات
export async function getGroups() {
  try {
    await dbConnect();
    const groups = await mongoose.model('Group').find();
    return JSON.parse(JSON.stringify(groups));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
}

export async function getGroupById(groupId: string) {
  try {
    await dbConnect();
    const group = await Group.findById(groupId).populate('adminId', 'name avatar');
    return group ? JSON.parse(JSON.stringify(group)) : null;
  } catch (error) {
    console.error('Error fetching group:', error);
    return null;
  }
}

export async function createGroup(groupData: {
  name: string;
  description: string;
  adminId: string;
  coverImageUrl?: string;
}) {
  try {
    await dbConnect();
    const group = new Group(groupData);
    await group.save();
    
    // إضافة المدير كعضو في المجموعة
    const member = new GroupMember({
      groupId: group._id,
      userId: groupData.adminId,
      role: 'admin',
      joinedAt: new Date()
    });
    await member.save();
    
    return JSON.parse(JSON.stringify(group));
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
}

// وظائف الرسائل
export async function getGroupMessages(groupId: string) {
  try {
    await dbConnect();
    const messages = await Message.find({ groupId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name avatar');
    
    return { messages: JSON.parse(JSON.stringify(messages)) };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { messages: [] };
  }
}

export async function createMessage(messageData: {
  content: string;
  senderId: string;
  groupId: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}) {
  try {
    await dbConnect();
    const message = new Message(messageData);
    await message.save();
    
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name avatar');
    
    return JSON.parse(JSON.stringify(populatedMessage));
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

// وظائف الأعضاء
export async function getGroupMembers(groupId: string) {
  try {
    await dbConnect();
    const members = await GroupMember.find({ groupId })
      .populate('userId', 'name avatar email')
      .sort({ joinedAt: 1 });
    
    return JSON.parse(JSON.stringify(members));
  } catch (error) {
    console.error('Error fetching group members:', error);
    return [];
  }
}

export async function addGroupMember(groupId: string, userId: string) {
  try {
    await dbConnect();
    
    // التحقق من عدم وجود العضو بالفعل
    const existingMember = await GroupMember.findOne({ groupId, userId });
    if (existingMember) {
      throw new Error('User is already a member of this group');
    }
    
    const member = new GroupMember({
      groupId,
      userId,
      role: 'member',
      joinedAt: new Date()
    });
    await member.save();
    
    return JSON.parse(JSON.stringify(member));
  } catch (error) {
    console.error('Error adding group member:', error);
    throw error;
  }
}

// وظائف المستخدمين
export async function getUserById(userId: string) {
  try {
    await dbConnect();
    const user = await User.findById(userId).select('-password');
    return user ? JSON.parse(JSON.stringify(user)) : null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function getUserGroups(userId: string) {
  try {
    await dbConnect();
    const memberships = await GroupMember.find({ userId })
      .populate('groupId')
      .sort({ joinedAt: -1 });
    
    return JSON.parse(JSON.stringify(memberships));
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return [];
  }
}








