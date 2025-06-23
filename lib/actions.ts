// lib/actions.ts
import Group from '@/models/Group';
import Message from '@/models/Message';
import dbConnect from './db';

export async function getGroups() {
  try {
    const connection = await dbConnect(); // استدعاء معدل
    const groups = await Group.find({}).populate('members.userId', 'name avatar');
    return JSON.parse(JSON.stringify(groups));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
}

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