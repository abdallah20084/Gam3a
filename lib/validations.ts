import { z } from 'zod';

// مخطط تسجيل المستخدم
export const registerSchema = z.object({
  name: z.string()
    .min(2, 'الاسم يجب أن يكون على الأقل حرفين')
    .max(50, 'الاسم يجب أن لا يتجاوز 50 حرف'),
  email: z.string()
    .email('البريد الإلكتروني غير صحيح')
    .min(5, 'البريد الإلكتروني يجب أن يكون على الأقل 5 أحرف')
    .max(100, 'البريد الإلكتروني يجب أن لا يتجاوز 100 حرف'),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون على الأقل 8 أحرف')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

// مخطط تسجيل الدخول
export const loginSchema = z.object({
  email: z.string()
    .email('البريد الإلكتروني غير صحيح'),
  password: z.string()
    .min(1, 'كلمة المرور مطلوبة'),
});

// مخطط إنشاء المجموعة
export const createGroupSchema = z.object({
  name: z.string()
    .min(2, 'اسم المجموعة يجب أن يكون على الأقل حرفين')
    .max(100, 'اسم المجموعة يجب أن لا يتجاوز 100 حرف'),
  description: z.string()
    .min(10, 'وصف المجموعة يجب أن يكون على الأقل 10 أحرف')
    .max(500, 'وصف المجموعة يجب أن لا يتجاوز 500 حرف'),
  coverImageUrl: z.string().optional(),
});

// مخطط الرسالة
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'محتوى الرسالة مطلوب')
    .max(1000, 'محتوى الرسالة يجب أن لا يتجاوز 1000 حرف'),
  groupId: z.string()
    .min(1, 'معرف المجموعة مطلوب'),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video']).optional(),
});

// مخطط تحرير المجموعة
export const editGroupSchema = z.object({
  name: z.string()
    .min(2, 'اسم المجموعة يجب أن يكون على الأقل حرفين')
    .max(100, 'اسم المجموعة يجب أن لا يتجاوز 100 حرف')
    .optional(),
  description: z.string()
    .min(10, 'وصف المجموعة يجب أن يكون على الأقل 10 أحرف')
    .max(500, 'وصف المجموعة يجب أن لا يتجاوز 500 حرف')
    .optional(),
  coverImageUrl: z.string().optional(),
});

// أنواع TypeScript
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type EditGroupInput = z.infer<typeof editGroupSchema>;

// دوال التحقق
export const validateRegister = (data: unknown): RegisterInput => {
  return registerSchema.parse(data);
};

export const validateLogin = (data: unknown): LoginInput => {
  return loginSchema.parse(data);
};

export const validateCreateGroup = (data: unknown): CreateGroupInput => {
  return createGroupSchema.parse(data);
};

export const validateMessage = (data: unknown): MessageInput => {
  return messageSchema.parse(data);
};

export const validateEditGroup = (data: unknown): EditGroupInput => {
  return editGroupSchema.parse(data);
}; 