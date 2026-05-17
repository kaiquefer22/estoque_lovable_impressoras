import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "@shared/const";
import { createHash } from "crypto";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import ExcelJS from "exceljs";
import { sendEmailToMultiple, sendEmailWithAttachments } from "./sendgrid";
import { generatePurchaseRequestExcel } from "./excelGenerator";
import { generatePurchaseRequestPDF } from "./pdfGenerator";
import { checkAndSendStockAlert } from './stockAlertService';

import {
  getDb,
  getAllPrinters, getPrinterById, createPrinter, updatePrinter, deletePrinter,
  getAllSupplies, getSupplyById, createSupply, updateSupply, deleteSupply,
  getSuppliesWithPrinter, getLowStockSupplies,
  createStockMovement, updateStockMovement, deleteStockMovement, getStockMovements, getDashboardStats, getStockByPrinter,
  logMovementUpdate, logMovementDelete, getMovementAuditLogs, notifyMovementEdit, notifyMovementDelete,
  getAllUsers, getUserById, updateUserProfile,
  createPurchaseOrder, addPurchaseOrderItems, getPurchaseOrders,
  getPurchaseOrderById, updatePurchaseOrder, updatePurchaseOrderItem,
  markOrderDelivered, getOutOfStockSupplies,
  getAllNotificationEmails, createNotificationEmail, deleteNotificationEmail,
  createPurchaseRequest, getPurchaseRequestsByOrder, updatePurchaseRequest,
  createOrderInspection,
  getOrderInspectionsByOrder,
  getInspectionItems,
  createInspectionItem,
  updateOrderInspection,
  createInspectionReport,
  approveEntryForInspection,
  getInspectionReportsByInspection, updateInspectionReport,
  getYearlyComparisonAllMonths,
  receiveOrderItems, getOrderItemsForInspection,
  getYearlyComparisonByTypeAndPrinter,
  getUserPermissions, updateUserPermissions, hasPermission, initializePermissions,
  logAudit, getAuditLogs, getAuditLogCount,
  getUserByEmail, createUserWithPassword, updateUserPassword, createAdminUser,
  createPasswordResetToken, verifyPasswordResetToken, resetPassword, isLoginRateLimited, recordLoginAttempt,
  createEmailVerificationToken, verifyEmailToken, hasVerifiedEmail,
  getPendingUsers, approveUser, rejectUser, deleteUser,
  checkUserPermission, getUserPermissionsMap, assignUserPermissions, initializeDefaultPermissions,
  getPermissionTemplates, getTemplatePermissions, applyTemplateToUser, getDailyAverageConsumption, calculateKPIs, getTimeToConsume1Unit,
  createOrderConfirmation, getOrderConfirmations, getAllConfirmations,
  predictStockCritical, predictAllStocksCritical,
  getEpsonP5000Supplies, getChicStockSummary, getChicSupplies, getMovementHistory, getMovementHistoryByDateRange,
  createDispatch, getDispatches, confirmDispatch, registerChicConsumption,
} from "./db";
import { TRPCError } from "@trpc/server";

import { validatePasswordStrength } from "./_core/passwordValidator";
import { sendPasswordResetEmail, sendEmail } from "./_core/emailService";
import { generatePieChartData, generateBarChartData, generateLineChartData, formatChartDataForTable, formatBarChartDataForTable, formatLineChartDataForTable } from "./chartGenerator";
import { passwordResetTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    debug: publicProcedure
      .input(z.object({ email: z.string(), password: z.string() }))
      .query(async ({ input }) => {
        console.log('[DEBUG] Testing login for:', input.email);
        const user = await getUserByEmail(input.email);
        console.log('[DEBUG] User found:', user ? { id: user.id, email: user.email, hasHash: !!user.passwordHash } : 'NOT FOUND');
        if (!user) return { success: false, message: 'User not found' };
        
        const inputHash = createHash('sha256').update(input.password).digest('hex');
        console.log('[DEBUG] Input hash:', inputHash);
        console.log('[DEBUG] Stored hash:', user.passwordHash);
        console.log('[DEBUG] Hashes match:', inputHash === user.passwordHash);
        
        return {
          success: inputHash === user.passwordHash,
          user: { id: user.id, email: user.email, role: user.role },
          debug: { inputHashMatch: inputHash === user.passwordHash }
        };
      }),
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    loginWithPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
      }))
      .mutation(async ({ input, ctx }) => {
        
        const user = await getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha inválidos' });
        }
        
        // Se o usuário não tem passwordHash, foi criado via OAuth
        
        if (!user.isApproved) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sua conta ainda nao foi aprovada. Aguarde a aprovacao de um administrador.' });
        }
        if (!user.passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Este email foi cadastrado via Google. Use o login com Google.' });
        }
        const passwordHash = createHash("sha256").update(input.password).digest("hex");
        if (passwordHash !== user.passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha inválidos' });
        }
        
        const sessionToken = await sdk.createPasswordSessionToken(user.id.toString(), { name: user.name || '' });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
        return { success: true, user };
      }),
    registerWithPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().min(1),
        password: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        
        
        // Validar força de senha
        const passwordStrength = validatePasswordStrength(input.password);
        if (!passwordStrength.isValid) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: `Senha fraca: ${passwordStrength.feedback.join(', ')}` 
          });
        }
        
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email já cadastrado' });
        }
        const passwordHash = createHash("sha256").update(input.password).digest("hex");
        const userId = await createUserWithPassword({
          email: input.email,
          name: input.name,
          passwordHash,
          role: "user",
        });
        return { success: true, userId };
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
        origin: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          return { success: true, message: "Se o email existir, um link de reset sera enviado" };
        }
        const token = await createPasswordResetToken(user.id);
        const appUrl = input.origin || process.env.APP_URL || "http://localhost:3000";
        await sendPasswordResetEmail(user.email || "", token, appUrl);
        return { success: true, message: "Se o email existir, um link de reset sera enviado" };
      }),
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const passwordStrength = validatePasswordStrength(input.newPassword);
        if (!passwordStrength.isValid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Senha fraca: ${passwordStrength.feedback.join(', ')}` });
        }
        const userId = await verifyPasswordResetToken(input.token);
        if (!userId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token invalido ou expirado' });
        }
        const passwordHash = createHash("sha256").update(input.newPassword).digest("hex");
        await updateUserPassword(userId, passwordHash);
        
        // Mark token as used to prevent reuse
        const db = await getDb();
        if (db) {
          await db.update(passwordResetTokens)
            .set({ usedAt: new Date() })
            .where(eq(passwordResetTokens.token, input.token));
        }
        
        return { success: true };
      }),
  }),

  // ==================== USERS ====================
  users: router({
    list: protectedProcedure.query(async () => {
      return getAllUsers();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getUserById(input.id);
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().optional(),
        avatarUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Users can only update their own profile unless admin
        if (ctx.user.id !== input.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
        }
        const { id, ...data } = input;
        await updateUserProfile(id, data);
        return { success: true };
      }),

    updateRole: adminProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await updateUserProfile(input.id, { role: input.role });
        return { success: true };
      }),

    updateUserAdmin: adminProcedure
      .input(z.object({
        id: z.number(),
        password: z.string().min(8).optional(),
        role: z.enum(["user", "admin"]).optional(),
        avatarUrl: z.string().optional(),
        permissions: z.array(z.object({
          moduleName: z.string(),
          actionName: z.string(),
          granted: z.boolean(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.id === input.id && input.role && input.role !== ctx.user.role) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nao pode alterar seu proprio role' });
        }
        
        if (input.role) {
          await updateUserProfile(input.id, { role: input.role });
        }
        
        if (input.avatarUrl !== undefined) {
          await updateUserProfile(input.id, { avatarUrl: input.avatarUrl });
        }
        
        if (input.password) {
          const passwordStrength = validatePasswordStrength(input.password);
          if (!passwordStrength.isValid) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `Senha fraca: ${passwordStrength.feedback.join(', ')}` });
          }
          const passwordHash = createHash('sha256').update(input.password).digest('hex');
          await updateUserPassword(input.id, passwordHash);
        }
        
        if (input.permissions && input.permissions.length > 0) {
          await assignUserPermissions(input.id, input.permissions as any);
        }
        
        return { success: true };
      }),

    uploadAvatar: protectedProcedure
      .input(z.object({
        base64: z.string(),
        mimeType: z.string(),
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.id !== input.userId && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
        }
        const ext = input.mimeType.split('/')[1] || 'png';
        const fileKey = `avatars/${input.userId}-${nanoid(8)}.${ext}`;
        const buffer = Buffer.from(input.base64, 'base64');
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        await updateUserProfile(input.userId, { avatarUrl: url });
        return { url };
      }),
    getPendingUsers: adminProcedure.query(async () => {
      return getPendingUsers();
    }),

    approveUser: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await approveUser(input.id);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao aprovar usuario' });
        }
        return { success: true };
      }),

    rejectUser: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await rejectUser(input.id);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao rejeitar usuario' });
        }
        return { success: true };
      }),

    deleteUserAdmin: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.id === input.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Voce nao pode deletar sua propria conta' });
        }
        const success = await deleteUser(input.id);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao deletar usuario' });
        }
        return { success: true };
      }),

    createUserAdmin: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(['user', 'admin']).default('user'),
        avatarUrl: z.string().optional(),
        permissions: z.array(z.object({
          moduleName: z.string(),
          actionName: z.string(),
          granted: z.boolean(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const passwordStrength = validatePasswordStrength(input.password);
        if (!passwordStrength.isValid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Senha fraca: ${passwordStrength.feedback.join(', ')}` });
        }
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'E-mail ja cadastrado' });
        }
        const passwordHash = createHash('sha256').update(input.password).digest('hex');
        const user = await createUserWithPassword({
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
        });
        
        // Atualizar avatar se fornecido
        if (input.avatarUrl) {
          await updateUserProfile(user.id, { avatarUrl: input.avatarUrl });
        }
        
        // Atribuir permissões se fornecidas
        if (input.permissions && input.permissions.length > 0) {
          await assignUserPermissions(user.id, input.permissions as any);
        }
        
        return { success: true, userId: user.id };
      }),

    assignPermissions: adminProcedure
      .input(z.object({
        userId: z.number(),
        permissions: z.array(z.object({
          moduleName: z.string(),
          actionName: z.string(),
          granted: z.boolean(),
        })),
      }))
      .mutation(async ({ input }) => {
        try {
          await assignUserPermissions(input.userId, input.permissions as any);
          return { success: true };
        } catch (error) {
          console.error('[Routers] Error assigning permissions:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'Erro ao atribuir permissoes' 
          });
        }
      }),
  }),

  // ==================== PRINTERS ====================
  printers: router({
    list: publicProcedure.query(async () => {
      return getAllPrinters();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getPrinterById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        model: z.string().min(1),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: Printers - Create
        const hasPermissionToCreate = await checkUserPermission(ctx.user.id, 'printers', 'create');
        if (!hasPermissionToCreate) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para cadastrar impressoras' });
        }
        const id = await createPrinter(input);
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || 'Usuário',
          action: 'create',
          module: 'printers',
          entityId: id,
          entityName: input.name,
          details: JSON.stringify({ summary: `Impressora "${input.name}" criada`, model: input.model }),
          timestamp: Date.now(),
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        model: z.string().optional(),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: Printers - Edit
        const hasPermissionToEdit = await checkUserPermission(ctx.user.id, 'printers', 'edit');
        if (!hasPermissionToEdit) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para editar impressoras' });
        }
        const { id, ...data } = input;
        await updatePrinter(id, data);
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || 'Usuário',
          action: 'update',
          module: 'printers',
          entityId: id,
          entityName: data.name || 'Impressora',
          details: JSON.stringify({ summary: `Impressora atualizada`, changes: data }),
          timestamp: Date.now(),
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: Printers - Delete
        const hasPermissionToDelete = await checkUserPermission(ctx.user.id, 'printers', 'delete');
        if (!hasPermissionToDelete) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para deletar impressoras' });
        }
        const printer = await getPrinterById(input.id);
        await deletePrinter(input.id);
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || 'Usuário',
          action: 'delete',
          module: 'printers',
          entityId: input.id,
          entityName: printer?.name || 'Impressora',
          details: JSON.stringify({ summary: `Impressora "${printer?.name}" deletada` }),
          timestamp: Date.now(),
        });
        return { success: true };
      }),
  }),

  // ==================== SUPPLIES ====================
  supplies: router({
    list: publicProcedure.query(async () => {
      const result = await getSuppliesWithPrinter();
      // Flatten the result so each item has printerName and printerModel at root level
      return result.map(r => ({
        ...r.supply,
        printerName: r.printerName,
        printerModel: r.printerModel,
      }));
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getSupplyById(input.id);
      }),

    getWithPrinter: publicProcedure
      .input(z.object({ printerId: z.number() }))
      .query(async ({ input }) => {
        return getSuppliesWithPrinter({ printerId: input.printerId });
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        color: z.string().optional(),
        quantity: z.number().min(0),
        minStock: z.number().min(0),
        printerIds: z.array(z.number()),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: Supplies - Create
        const hasPermissionToCreate = await checkUserPermission(ctx.user.id, 'supplies', 'create');
        if (!hasPermissionToCreate) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para cadastrar insumos' });
        }
        const id = await createSupply({
          name: input.name,
          code: input.code,
          color: input.color,
          minStock: input.minStock,
          type: "cartucho",
          printerId: input.printerIds[0] || 1,
          imageUrl: input.imageUrl,
        });
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || 'Usuário',
          action: 'create',
          module: 'supplies',
          entityId: id,
          entityName: input.name,
          details: JSON.stringify({ summary: `Insumo "${input.name}" criado`, code: input.code }),
          timestamp: Date.now(),
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        color: z.string().optional(),
        quantity: z.number().optional(),
        minStock: z.number().optional(),
        printerIds: z.array(z.number()).optional(),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: Supplies - Edit
        const hasPermissionToEdit = await checkUserPermission(ctx.user.id, 'supplies', 'edit');
        if (!hasPermissionToEdit) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para editar insumos' });
        }
        const { id, printerIds, quantity, ...data } = input;
        const updateData: any = data;
        if (printerIds && printerIds.length > 0) {
          updateData.printerId = printerIds[0];
        }
        await updateSupply(id, updateData);
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || 'Usuário',
          action: 'update',
          module: 'supplies',
          entityId: id,
          entityName: data.name || 'Insumo',
          details: JSON.stringify({ summary: `Insumo atualizado`, changes: data }),
          timestamp: Date.now(),
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: Supplies - Delete
        const hasPermissionToDelete = await checkUserPermission(ctx.user.id, 'supplies', 'delete');
        if (!hasPermissionToDelete) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para deletar insumos' });
        }
        await deleteSupply(input.id);
        return { success: true };
      }),

    getLowStock: publicProcedure.query(async () => {
      return getLowStockSupplies();
    }),

    getOutOfStock: publicProcedure.query(async () => {
      return getOutOfStockSupplies();
    }),
  }),

  // ==================== MOVEMENTS ====================
  movements: router({
    list: publicProcedure
      .input(z.object({
        companyId: z.number().optional(),
        supplyId: z.number().optional(),
        printerId: z.number().optional(),
        type: z.string().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return getStockMovements(input);
      }),

    create: protectedProcedure
      .input(z.object({
        supplyId: z.number(),
        quantity: z.number().min(1),
        type: z.enum(["entrada", "saida"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission based on movement type
        const moduleId = input.type === 'entrada' ? 3 : 4; // Entry (3) or Exit (4)
        const hasPermissionToCreate = await hasPermission(ctx.user.id, moduleId, 2);
        if (!hasPermissionToCreate && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao para registrar movimentacoes' });
        }
        const result = await createStockMovement({
          ...input,
          userId: ctx.user.id,
          movementDate: Date.now(),
        });
        return result;
      }),

    createBatch: protectedProcedure
      .input(z.object({
        movements: z.array(z.object({
          supplyId: z.number(),
          quantity: z.number().min(1),
          type: z.enum(["entrada", "saida"]),
          notes: z.string().optional(),
        })),
        movementDate: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission for each movement type
        for (const mov of input.movements) {
          const moduleId = mov.type === 'entrada' ? 3 : 4;
          const hasPermissionToCreate = await hasPermission(ctx.user.id, moduleId, 2);
          if (!hasPermissionToCreate && ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao para registrar movimentacoes' });
          }
        }
        const results = await Promise.all(
          input.movements.map(mov =>
            createStockMovement({
              ...mov,
              userId: ctx.user.id,
              movementDate: input.movementDate || Date.now(),
            })
          )
        );
        return { ids: results.map(r => r.id) };
      }),

    importCSV: protectedProcedure
      .input(z.object({
        movements: z.array(z.object({
          supply_id: z.number(),
          quantity: z.number().min(1),
          type: z.enum(["entrada", "saida"]),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const results = await Promise.all(
          input.movements.map(mov =>
            createStockMovement({
              supplyId: mov.supply_id,
              quantity: mov.quantity,
              type: mov.type,
              notes: mov.notes,
              userId: ctx.user.id,
              movementDate: Date.now(),
            })
          )
        );
        return { ids: results.map(r => r.id), count: results.length };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        quantity: z.number().min(1),
        type: z.enum(["entrada", "saida"]),
        notes: z.string().optional(),
        movementDate: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: History - Edit
        const hasPermissionToEdit = await checkUserPermission(ctx.user.id, 'entrada', 'edit');
        if (!hasPermissionToEdit && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao para editar movimentacoes' });
        }
        // Get previous data for audit log
        const movementsList = await getStockMovements({ limit: 1, offset: 0 });
        const previousMovement = movementsList.movements.find((m: any) => m.movement.id === input.id)?.movement;
        
        const result = await updateStockMovement(input.id, {
          quantity: input.quantity,
          type: input.type,
          notes: input.notes,
          movementDate: input.movementDate,
        });
        
        // Log audit
        if (previousMovement) {
          await logMovementUpdate(
            ctx.user.id,
            ctx.user.name || 'Unknown',
            input.id,
            previousMovement,
            result
          );
          
          // Send notification email to admins
          try {
            const notificationEmails = await getAllNotificationEmails();
            if (notificationEmails.length > 0) {
              const adminEmails = notificationEmails.map((e: any) => e.email);
              await notifyMovementEdit(
                input.id,
                ctx.user.id,
                ctx.user.name || 'Unknown',
                previousMovement,
                { ...previousMovement, ...input },
                adminEmails
              );
            }
          } catch (error) {
            console.error('Failed to send edit notification:', error);
          }
        }
        
        return result;
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
        deletionReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: History - Delete
        const hasPermissionToDelete = await checkUserPermission(ctx.user.id, 'entrada', 'delete');
        if (!hasPermissionToDelete && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao para deletar movimentacoes' });
        }
        // Get movement data for audit log before deletion
        const movementsList = await getStockMovements({ limit: 1, offset: 0 });
        const movementToDelete = movementsList.movements.find((m: any) => m.movement.id === input.id)?.movement;
        
        const result = await deleteStockMovement(input.id);
        
        // Log audit
        if (movementToDelete) {
          await logMovementDelete(
            ctx.user.id,
            ctx.user.name || 'Unknown',
            input.id,
            movementToDelete
          );
          
          // Send notification email to admins
          try {
            const notificationEmails = await getAllNotificationEmails();
            if (notificationEmails.length > 0) {
              const adminEmails = notificationEmails.map((e: any) => e.email);
              await notifyMovementDelete(
                input.id,
                ctx.user.id,
                ctx.user.name || 'Unknown',
                movementToDelete,
                input.deletionReason || '',
                adminEmails
              );
            }
          } catch (error) {
            console.error('Failed to send delete notification:', error);
          }
        }
        
        return result;
      }),

    getAuditLog: protectedProcedure
      .input(z.object({
        movementId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        // Check permission: History - View
        const hasPermissionToView = await checkUserPermission(ctx.user.id, 'entrada', 'view');
        if (!hasPermissionToView && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao para visualizar auditoria' });
        }
        return await getMovementAuditLogs(input.movementId);
      }),
  }),

  // ==================== PURCHASE ORDERS ====================
  orders: router({
    list: publicProcedure.query(async () => {
      return getPurchaseOrders();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getPurchaseOrderById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        orderNumber: z.string().optional(),
        supplier: z.string().min(1),
        orderDate: z.number(),
        estimatedDelivery: z.number().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          supplyId: z.number(),
          quantity: z.number().min(1),
          unitPrice: z.string().optional(),
          expectedReturnDate: z.number().optional(),
          notes: z.string().optional(),
        })).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: Orders - Create
        const hasPermissionToCreate = await checkUserPermission(ctx.user.id, 'pedidos', 'create');
        if (!hasPermissionToCreate) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao para criar pedidos' });
        }
        const { items, ...orderData } = input;
        const orderId = await createPurchaseOrder({
          ...orderData,
          status: "pendente",
          userId: ctx.user.id,
        });
        await addPurchaseOrderItems(items.map(item => ({
          ...item,
          orderId,
        })));
        return { id: orderId };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pendente", "em_transito", "entregue", "cancelado"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.status === "entregue") {
          await markOrderDelivered(input.id, ctx.user.id);
        } else {
          await updatePurchaseOrder(input.id, { status: input.status });
        }
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        orderNumber: z.string().optional(),
        supplier: z.string().optional(),
        estimatedDelivery: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: Orders - Edit
        const hasPermissionToEdit = await checkUserPermission(ctx.user.id, 'pedidos', 'edit');
        if (!hasPermissionToEdit) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao para editar pedidos' });
        }
        const { id, ...data } = input;
        await updatePurchaseOrder(id, data);
        return { success: true };
      }),

    getItemsForInspection: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return getOrderItemsForInspection(input.orderId);
      }),

    receiveItems: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        itemIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        return receiveOrderItems(input.orderId, input.itemIds, ctx.user.id);
      }),

    // Conferir pedido SEM dar entrada (só registra confirmação)
    confirmOnly: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        itemIds: z.array(z.number()),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar permissão de conferência
        const canConfirm = await checkUserPermission(ctx.user.id, 'conferencia', 'create');
        if (!canConfirm) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para realizar conferência' });
        }
        const result = await createOrderConfirmation({
          orderId: input.orderId,
          userId: ctx.user.id,
          itemIds: input.itemIds,
          withEntry: false,
          notes: input.notes,
        });
        return { success: true, confirmationId: result.id };
      }),

    // Conferir pedido E dar entrada ao mesmo tempo
    confirmAndReceive: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        itemIds: z.array(z.number()),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar permissão de conferência
        const canConfirm = await checkUserPermission(ctx.user.id, 'conferencia', 'create');
        if (!canConfirm) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para realizar conferência' });
        }
        // Verificar permissão de entrada (orders edit)
        const canEntry = await checkUserPermission(ctx.user.id, 'pedidos', 'edit');
        if (!canEntry) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para dar entrada de itens' });
        }
        // Registrar confirmação
        const confirmation = await createOrderConfirmation({
          orderId: input.orderId,
          userId: ctx.user.id,
          itemIds: input.itemIds,
          withEntry: true,
          notes: input.notes,
        });
        // Dar entrada
        const receiveResult = await receiveOrderItems(input.orderId, input.itemIds, ctx.user.id);
        return { success: true, confirmationId: confirmation.id, allReceived: receiveResult.allReceived };
      }),

    // Listar conferências de um pedido
    getConfirmations: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return getOrderConfirmations(input.orderId);
      }),

    // Listar todas as conferências
    listAllConfirmations: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
        userId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAllConfirmations(input);
      }),

    sendConfirmationReport: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        emails: z.array(z.string().email()),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const confirmations = await getOrderConfirmations(input.orderId);
          if (!confirmations || confirmations.length === 0) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Nenhuma conferencia encontrada para este pedido',
            });
          }

          const csvHeader = 'Data,Usuario,Tipo,Observacoes\n';
          const csvRows = confirmations.map(c => {
            const date = new Date(c.confirmation.confirmedAt).toLocaleString('pt-BR');
            const type = c.confirmation.withEntry ? 'Conferiu + Entrada' : 'So Conferiu';
            const notes = (c.confirmation.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');
            return `"${date}","${c.userName}","${type}","${notes}"`;
          }).join('\n');
          const csv = csvHeader + csvRows;

          const subject = `Relatorio de Conferencia - Pedido #${input.orderId}`;
          const body = `Relatorio de conferencia do pedido #${input.orderId}\n\nTotal de conferencias: ${confirmations.length}\n\nVer arquivo anexado para detalhes.`;

          for (const email of input.emails) {
            await sendEmail(
              email,
              subject,
              `<p>${body.replace(/\n/g, '<br>')}</p>`,
              body
            );
          }

          return { success: true, emailsSent: input.emails.length };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error?.message || 'Erro ao enviar relatorio',
          });
        }
      }),
  }),

  // ==================== TEMPLATE ====================
  template: router({
    downloadMovementTemplate: publicProcedure.query(async () => {
      const supplies = await getAllSupplies();
      return supplies.map(s => ({
        supply_id: s.id,
        quantity: 1,
        supplyName: s.name
      }));
    }),
  }),

  // ==================== REPORTS ====================
  reports: router({
    getYearlyComparison: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        return getYearlyComparisonAllMonths(input.year);
      }),

    generateExcel: protectedProcedure
      .input(z.object({
        movements: z.array(z.any()),
        summary: z.object({
          entradas: z.number(),
          saidas: z.number(),
          totalEntrada: z.number(),
          totalSaida: z.number(),
        }),
        yearlyComparison: z.array(z.any()).optional(),
        timeToConsume1Unit: z.array(z.any()).optional(),
        currentStock: z.array(z.any()).optional(),
        kpis: z.any().optional(),
        printerStock: z.array(z.any()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission: Reports - Create
        const hasPermissionToGenerate = await checkUserPermission(ctx.user.id, 'relatorios', 'create');
        if (!hasPermissionToGenerate) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao para gerar relatorios' });
        }
        try {
          const workbook = new ExcelJS.Workbook();
          const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } };
          const headerFont = { bold: true, color: { argb: "FFFFFFFF" } };
          const borderStyle = { style: "thin", color: { argb: "FFD3D3D3" } };
          const borders = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
          
          // RESUMO EXECUTIVO
          const summarySheet = workbook.addWorksheet("Resumo Executivo");
          summarySheet.columns = [
            { header: "Metrica", key: "metric", width: 35 },
            { header: "Valor", key: "value", width: 20 },
          ];
          summarySheet.getRow(1).font = headerFont;
          summarySheet.getRow(1).fill = headerFill as any;
          
          summarySheet.addRow({ metric: "Total de Entradas", value: input.summary.entradas });
          summarySheet.addRow({ metric: "Total de Saidas", value: input.summary.saidas });
          summarySheet.addRow({ metric: "Quantidade Entrada (un)", value: input.summary.totalEntrada });
          summarySheet.addRow({ metric: "Quantidade Saida (un)", value: input.summary.totalSaida });
          summarySheet.addRow({ metric: "Saldo Liquido (un)", value: input.summary.totalEntrada - input.summary.totalSaida });
          
          if (input.kpis) {
            summarySheet.addRow({});
            summarySheet.addRow({ metric: "KPI: Taxa de Reposicao", value: input.kpis.replacementRate?.toFixed(2) + "%" || "-" });
            summarySheet.addRow({ metric: "KPI: Tempo Medio Consumo", value: input.kpis.avgTimeToConsume?.toFixed(1) + " dias" || "-" });
            summarySheet.addRow({ metric: "KPI: Eficiencia Estoque", value: input.kpis.stockEfficiency?.toFixed(2) + "%" || "-" });
          }
          
          for (let i = 2; i <= summarySheet.rowCount; i++) {
            summarySheet.getRow(i).border = borders as any;
          }
          
          // ESTOQUE ATUAL
          if (input.currentStock && input.currentStock.length > 0) {
            const stockSheet = workbook.addWorksheet("Estoque Atual");
            stockSheet.columns = [
              { header: "Insumo", key: "name", width: 25 },
              { header: "Cor", key: "color", width: 15 },
              { header: "Quantidade", key: "qty", width: 12 },
              { header: "Status", key: "status", width: 12 },
              { header: "Valor Unit.", key: "unitValue", width: 12 },
              { header: "Valor Total", key: "totalValue", width: 12 },
            ];
            stockSheet.getRow(1).font = headerFont;
            stockSheet.getRow(1).fill = headerFill as any;
            
            let totalValue = 0;
            input.currentStock.forEach((item: any, idx: number) => {
              const row = stockSheet.addRow({
                name: item.supplyName,
                color: item.supplyColor || "-",
                qty: item.quantity,
                status: item.quantity > item.criticalLevel ? "OK" : "CRITICO",
                unitValue: item.unitValue?.toFixed(2) || "-",
                totalValue: (item.quantity * (item.unitValue || 0)).toFixed(2),
              });
              
              if (item.supplyColorHex) {
                const colorRgb = item.supplyColorHex.replace("#", "");
                const textColor = item.supplyTextColor === "white" ? "FFFFFFFF" : "FF000000";
                row.getCell(2).fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: `FF${colorRgb}` },
                };
                row.getCell(2).font = { color: { argb: textColor }, bold: true };
              }
              
              if (item.quantity <= item.criticalLevel) {
                row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6B6B" } };
                row.getCell(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
              }
              
              totalValue += item.quantity * (item.unitValue || 0);
            });
            
            const totalRow = stockSheet.addRow({
              name: "TOTAL",
              color: "",
              qty: "",
              status: "",
              unitValue: "",
              totalValue: totalValue.toFixed(2),
            });
            totalRow.font = { bold: true };
            totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
          }
          
          // MOVIMENTACOES
          const movSheet = workbook.addWorksheet("Movimentacoes");
          movSheet.columns = [
            { header: "Data", key: "date", width: 12 },
            { header: "Tipo", key: "type", width: 10 },
            { header: "Insumo", key: "supply", width: 20 },
            { header: "Cor", key: "color", width: 15 },
            { header: "Impressora", key: "printer", width: 20 },
            { header: "Qtd", key: "qty", width: 8 },
            { header: "Usuario", key: "user", width: 15 },
          ];
          movSheet.getRow(1).font = headerFont;
          movSheet.getRow(1).fill = headerFill as any;
          
          let entradaCount = 0, saidaCount = 0;
          input.movements.forEach((m: any) => {
            const date = new Date(m.movement.movementDate).toLocaleDateString("pt-BR");
            const type = m.movement.type === "entrada" ? "Entrada" : "Saida";
            if (type === "Entrada") entradaCount += m.movement.quantity;
            else saidaCount += m.movement.quantity;
            
            const row = movSheet.addRow({
              date,
              type,
              supply: m.supplyName,
              color: m.supplyColor || "-",
              printer: m.printerName,
              qty: m.movement.quantity,
              user: m.userName || "-",
            });
            
            if (m.supplyColor && m.supplyColorHex) {
              const colorRgb = m.supplyColorHex.replace("#", "");
              const textColor = m.supplyTextColor === "white" ? "FFFFFFFF" : "FF000000";
              row.getCell(4).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: `FF${colorRgb}` },
              };
              row.getCell(4).font = { color: { argb: textColor }, bold: true };
            }
            
            if (type === "Entrada") {
              row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4EDDA" } };
            } else {
              row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" } };
            }
          });
          
          // COMPARATIVO ANUAL
          if (input.yearlyComparison && input.yearlyComparison.length > 0) {
            const compSheet = workbook.addWorksheet("Comparativo Anual");
            compSheet.columns = [
              { header: "Mes", key: "month", width: 15 },
              { header: "2026", key: "current", width: 15 },
              { header: "2025", key: "previous", width: 15 },
              { header: "Variacao %", key: "variation", width: 15 },
            ];
            compSheet.getRow(1).font = headerFont;
            compSheet.getRow(1).fill = headerFill as any;
            
            input.yearlyComparison.forEach((row: any) => {
              const current = row.current_year || row.currentYear || 0;
              const previous = row.previous_year || row.previousYear || 0;
              const variationNum = previous > 0 ? (((current - previous) / previous) * 100) : 0;
              const variation = variationNum.toFixed(2);
              
              const newRow = compSheet.addRow({
                month: row.month,
                current,
                previous,
                variation: variation + "%",
              });
              
              if (variationNum > 0) {
                newRow.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4EDDA" } } as any;
              } else if (variationNum < 0) {
                newRow.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" } } as any;
              }
            });
          }
          
          // TEMPO PARA CONSUMIR
          if (input.timeToConsume1Unit && input.timeToConsume1Unit.length > 0) {
            const consumeSheet = workbook.addWorksheet("Tempo para Consumir");
            consumeSheet.columns = [
              { header: "Impressora", key: "printer", width: 20 },
              { header: "Tipo de Papel", key: "supply", width: 25 },
              { header: "Consumo Diario", key: "daily", width: 15 },
              { header: "Dias para 1 Un", key: "days", width: 15 },
            ];
            consumeSheet.getRow(1).font = headerFont;
            consumeSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
            
            input.timeToConsume1Unit.forEach((item: any) => {
              consumeSheet.addRow({
                printer: item.printerName,
                supply: item.supplyName,
                daily: item.dailyConsumption?.toFixed(2) || "-",
                days: item.daysToConsume1Unit || "-",
              });
            });
          }
          
          // ESTOQUE POR IMPRESSORA
          if (input.printerStock && input.printerStock.length > 0) {
            const printerSheet = workbook.addWorksheet("Estoque por Impressora");
            printerSheet.columns = [
              { header: "Impressora", key: "printer", width: 25 },
              { header: "Insumo", key: "supply", width: 20 },
              { header: "Quantidade", key: "qty", width: 12 },
              { header: "Status", key: "status", width: 12 },
            ];
            printerSheet.getRow(1).font = headerFont;
            printerSheet.getRow(1).fill = headerFill as any;
            
            input.printerStock.forEach((item: any) => {
              const row = printerSheet.addRow({
                printer: item.printerName,
                supply: item.supplyName,
                qty: item.quantity,
                status: item.quantity > 0 ? "OK" : "VAZIO",
              });
              
              if (item.quantity === 0) {
                row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6B6B" } };
                row.getCell(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
              }
            });
          }
          
          // ADICIONAR ABA DE GRÁFICOS COM DADOS TABULARES
          try {
            if (input.movements && input.movements.length > 0) {
              const chartsSheet = workbook.addWorksheet('Análise de Gráficos');
              let rowNum = 1;
              
              // Gráfico de Pizza - Consumo por Insumo
              const pieData = generatePieChartData(input.movements);
              const pieTable = formatChartDataForTable(pieData);
              
              chartsSheet.getCell(rowNum, 1).value = 'Consumo por Insumo';
              chartsSheet.getCell(rowNum, 1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
              chartsSheet.getCell(rowNum, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
              rowNum++;
              
              chartsSheet.getCell(rowNum, 1).value = 'Insumo';
              chartsSheet.getCell(rowNum, 2).value = 'Quantidade';
              chartsSheet.getCell(rowNum, 3).value = 'Percentual';
              [1, 2, 3].forEach(col => {
                chartsSheet.getCell(rowNum, col).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                chartsSheet.getCell(rowNum, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
              });
              rowNum++;
              
              pieTable.forEach(row => {
                chartsSheet.getCell(rowNum, 1).value = row.label;
                chartsSheet.getCell(rowNum, 2).value = row.value;
                chartsSheet.getCell(rowNum, 3).value = row.percentage;
                rowNum++;
              });
              
              rowNum += 2;
              
              // Gráfico de Barras - Movimentações por Tipo
              const barData = generateBarChartData(input.movements);
              const barTable = formatBarChartDataForTable(barData);
              
              chartsSheet.getCell(rowNum, 1).value = 'Movimentações por Tipo';
              chartsSheet.getCell(rowNum, 1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
              chartsSheet.getCell(rowNum, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
              rowNum++;
              
              chartsSheet.getCell(rowNum, 1).value = 'Tipo';
              chartsSheet.getCell(rowNum, 2).value = 'Quantidade';
              chartsSheet.getCell(rowNum, 3).value = 'Percentual';
              [1, 2, 3].forEach(col => {
                chartsSheet.getCell(rowNum, col).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                chartsSheet.getCell(rowNum, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
              });
              rowNum++;
              
              barTable.forEach(row => {
                chartsSheet.getCell(rowNum, 1).value = row.category;
                chartsSheet.getCell(rowNum, 2).value = row.quantity;
                chartsSheet.getCell(rowNum, 3).value = row.percentage;
                rowNum++;
              });
              
              rowNum += 2;
              
              // Gráfico de Linhas - Tendências Mensais
              const lineData = generateLineChartData(input.movements);
              const lineTable = formatLineChartDataForTable(lineData);
              
              chartsSheet.getCell(rowNum, 1).value = 'Tendências Mensais';
              chartsSheet.getCell(rowNum, 1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
              chartsSheet.getCell(rowNum, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
              rowNum++;
              
              chartsSheet.getCell(rowNum, 1).value = 'Período';
              lineData.datasets.forEach((ds, idx) => {
                chartsSheet.getCell(rowNum, 2 + idx).value = ds.label;
              });
              [1, 2, 3].forEach(col => {
                const cell = chartsSheet.getCell(rowNum, col);
                if (cell.value) {
                  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
                }
              });
              rowNum++;
              
              lineTable.forEach(row => {
                chartsSheet.getCell(rowNum, 1).value = row.period;
                lineData.datasets.forEach((ds, idx) => {
                  chartsSheet.getCell(rowNum, 2 + idx).value = (row as any)[ds.label];
                });
                rowNum++;
              });
              
              // Ajustar largura das colunas
              chartsSheet.columns = [
                { width: 20 },
                { width: 15 },
                { width: 15 }
              ];
            }
          } catch (chartErr) {
            console.log('Erro ao gerar dados de gráficos:', chartErr);
          }
          
          const buffer = await workbook.xlsx.writeBuffer();
          const fileKey = `reports/relatorio-${nanoid()}.xlsx`;
          const result = await storagePut(fileKey, buffer as any, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          
          return { url: result.url };
        } catch (error) {
          console.error("Excel generation error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao gerar Excel" });
        }
      }),

    getYearlyComparisonByTypeAndPrinter: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        return await getYearlyComparisonByTypeAndPrinter(input.year);
      }),

    getDailyAverageConsumption: protectedProcedure
      .input(z.object({
        startDate: z.number().optional(),
        endDate: z.number().optional(),
        supplyType: z.enum(["papel", "cartucho", "tanque"]).optional(),
      }))
      .query(async ({ input }) => {
        return await getDailyAverageConsumption(input.startDate, input.endDate, input.supplyType);
      }),

    getKPIs: protectedProcedure
      .input(z.object({
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const hasPermission = await checkUserPermission(ctx.user.id, 'relatorios', 'view');
        if (!hasPermission) throw new TRPCError({ code: 'FORBIDDEN' });
        return await calculateKPIs(input.startDate, input.endDate);
      }),

    getTimeToConsume1Unit: protectedProcedure
      .input(z.object({
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const hasPermission = await checkUserPermission(ctx.user.id, 'relatorios', 'view');
        if (!hasPermission) throw new TRPCError({ code: 'FORBIDDEN' });
        return await getTimeToConsume1Unit(input.startDate, input.endDate);
      }),



    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
        origin: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          return { success: true, message: "Se o email existir, um link de reset sera enviado" };
        }
        const token = await createPasswordResetToken(user.id);
        const appUrl = input.origin || process.env.APP_URL || "http://localhost:3000";
        await sendPasswordResetEmail(user.email || "", token, appUrl);
        return { success: true, message: "Se o email existir, um link de reset sera enviado" };
      }),
    sendPurchaseRequest: protectedProcedure
      .input(z.object({
        recipientEmails: z.array(z.string().email()),
        items: z.array(z.object({
          supplyId: z.number(),
          supplyName: z.string(),
          supplyCode: z.string().optional(),
          supplyColor: z.string().optional(),
          supplyImageUrl: z.string().optional(),
          printerName: z.string().optional(),
          quantity: z.number(),
        })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!input.items.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum insumo selecionado" });
        if (!input.recipientEmails.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum e-mail de destino" });

        const requestId = await createPurchaseRequest({
          orderId: 0,
          requestDate: Date.now(),
          sentDate: Date.now(),
          userId: ctx.user.id,
          status: "enviado",
          recipientEmails: input.recipientEmails.join(","),
          notes: input.notes || null,
        });

        // Group items by printer
        const itemsByPrinter: Record<string, typeof input.items> = {};
        input.items.forEach(item => {
          const key = item.printerName || "Sem Impressora";
          if (!itemsByPrinter[key]) itemsByPrinter[key] = [];
          itemsByPrinter[key].push(item);
        });

        // Generate HTML email content with colored cards
        const SUPPLY_COLORS: Record<string, string> = {
          "Black": "#000000", "Cyan": "#00BCD4", "Magenta": "#E91E63", "Yellow": "#FFC107",
          "Red": "#F44336", "Green": "#4CAF50", "Blue": "#2196F3", "Orange": "#FF9800",
          "Purple": "#9C27B0", "Gray": "#9E9E9E", "Light Black": "#424242", "Light Cyan": "#80DEEA",
        };
        const getColor = (name?: string) => SUPPLY_COLORS[name || ""] || "#E5E7EB";
        const getTextColor = (bg: string) => (bg === "#000000" || bg === "#424242") ? "#FFFFFF" : "#000000";

        let htmlContent = `<html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;margin:0;padding:10px}.container{max-width:100%;margin:0 auto}.printer-section{margin-bottom:20px}.printer-name{font-size:16px;font-weight:bold;color:#333;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #7C3AED}.items-table{width:100%;border-collapse:collapse;margin-bottom:15px}.items-table th{background-color:#7C3AED;color:white;padding:10px;text-align:left;font-weight:bold;border:1px solid #7C3AED;font-size:13px}.items-table td{padding:10px;border:1px solid #E5E7EB;text-align:left;vertical-align:middle;font-size:13px}.items-table tr:nth-child(even){background-color:#F9FAFB}.item-image{max-width:50px;max-height:50px;border-radius:3px;display:block}.item-color-box{display:inline-block;width:20px;height:20px;border-radius:3px;border:1px solid #ccc;vertical-align:middle}</style></head><body><div class="container">`;

        // Fetch supply details to get images
        const suppliesWithDetails = await Promise.all(
          input.items.map(async (item) => {
            const supply = await getSupplyById(item.supplyId);
            return { ...item, supplyImageUrl: supply?.imageUrl };
          })
        );
        
        // Re-group items by printer with image URLs
        const itemsByPrinterWithImages: Record<string, typeof suppliesWithDetails> = {};
        suppliesWithDetails.forEach(item => {
          const key = item.printerName || "Sem Impressora";
          if (!itemsByPrinterWithImages[key]) itemsByPrinterWithImages[key] = [];
          itemsByPrinterWithImages[key].push(item);
        });
        
        Object.entries(itemsByPrinterWithImages).forEach(([printerName, items]) => {
          htmlContent += `<div class="printer-section"><div class="printer-name">🖨️ ${printerName}</div><table class="items-table"><thead><tr><th>Imagem</th><th>Nome do Insumo</th><th>Código</th><th>Cor</th><th>Quantidade</th></tr></thead><tbody>`;
          items.forEach(item => {
            const bgColor = getColor(item.supplyColor);
            const colorBox = `<span class="item-color-box" style="background-color:${bgColor};"></span>`;
            const imageCell = item.supplyImageUrl ? `<img src="${item.supplyImageUrl}" alt="${item.supplyName}" class="item-image" />` : '<span style="color:#999;">-</span>';
            htmlContent += `<tr><td style="text-align:center;">${imageCell}</td><td><strong>${item.supplyName}</strong></td><td>${item.supplyCode || '-'}</td><td>${colorBox} ${item.supplyColor || '-'}</td><td><strong>${item.quantity} un</strong></td></tr>`;
          });
          htmlContent += `</tbody></table></div>`;
        });

        htmlContent += `</div></body></html>`;

        const itemsList = input.items.map(i => `${i.supplyName} (${i.quantity} un)`).join(", ");
        const totalQty = input.items.reduce((sum, item) => sum + item.quantity, 0);
        const itemsWithImagesCount = suppliesWithDetails.filter(i => i.supplyImageUrl).length;
        
        // Generate PDF attachment with supplies table and images
        const pdfItems = suppliesWithDetails.map(item => ({
          supplyName: item.supplyName,
          quantity: item.quantity,
          supplyCode: item.supplyCode || undefined,
          supplyColor: item.supplyColor || undefined,
          supplyImageUrl: item.supplyImageUrl || undefined,
          printerName: item.printerName || undefined,
        }));

        let pdfBuffer: Buffer | null = null;
        try {
          pdfBuffer = await generatePurchaseRequestPDF(
            pdfItems,
            requestId,
            ctx.user.name || "Usuario",
            input.notes
          );
          console.log(`[PDF] Generated PDF for request #${requestId}: ${pdfBuffer.length} bytes`);
        } catch (pdfError) {
          console.error("[PDF] Error generating PDF:", pdfError);
        }

        // Generate Excel attachment
        let excelBuffer: Buffer | null = null;
        try {
          excelBuffer = await generatePurchaseRequestExcel(
            pdfItems,
            requestId,
            ctx.user.name || "Usuario",
            input.notes
          );
          console.log(`[Excel] Generated Excel for request #${requestId}: ${excelBuffer.length} bytes`);
        } catch (excelError) {
          console.error("[Excel] Error generating Excel:", excelError);
        }

        // Build attachments array
        const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
        if (pdfBuffer) {
          attachments.push({
            filename: `solicitacao-insumos-${requestId}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          });
        }
        if (excelBuffer) {
          attachments.push({
            filename: `solicitacao-insumos-${requestId}.xlsx`,
            content: excelBuffer,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
        }

        // Send email directly via SendGrid (no Manus notification)
        const emailSent = await sendEmailWithAttachments(
          input.recipientEmails,
          `Solicitacao de Insumos #${requestId} - StudioLaser`,
          htmlContent,
          attachments
        );

        console.log(`[Solicitacao] #${requestId} enviada para ${input.recipientEmails.length} e-mail(s). PDF: ${!!pdfBuffer}, Excel: ${!!excelBuffer}, Email: ${emailSent}`);

        return { success: emailSent, requestId, itemsCount: input.items.length, totalQuantity: totalQty, itemsWithImages: itemsWithImagesCount, emailSent, pdfGenerated: !!pdfBuffer, excelGenerated: !!excelBuffer };
      }),

    predictCritical: protectedProcedure
      .input(z.object({ supplyId: z.number(), daysAhead: z.number().optional() }))
      .query(async ({ input }) => {
        return predictStockCritical(input.supplyId, input.daysAhead || 30);
      }),

    predictAllCritical: protectedProcedure
      .input(z.object({ daysAhead: z.number().optional() }))
      .query(async ({ input }) => {
        return predictAllStocksCritical(input.daysAhead || 30);
      }),
  }),

  // ==================== DASHBOARD ====================
  dashboard: router({
    stats: publicProcedure.query(async () => {
      return getDashboardStats();
    }),

    stockByPrinter: publicProcedure.query(async () => {
      return getStockByPrinter();
    }),
  }),


  // ==================== NOTIFICATION EMAILS ====================
  emails: router({
    list: adminProcedure.query(async () => {
      return getAllNotificationEmails();
    }),

    create: adminProcedure
      .input(z.object({
        email: z.string().email(),
        type: z.enum(["solicitacao", "conferencia", "ambos"]),
      }))
      .mutation(async ({ input }) => {
        const id = await createNotificationEmail({
          email: input.email,
          type: input.type,
          isActive: true,
        });
        return { id };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteNotificationEmail(input.id);
        return { success: true };
      }),
  }),

  // ==================== PURCHASE REQUESTS ====================
  requests: router({
    getByOrder: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return getPurchaseRequestsByOrder(input.orderId);
      }),

    create: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        recipientEmails: z.array(z.string().email()),
        csvData: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const requestId = await createPurchaseRequest({
          orderId: input.orderId,
          requestDate: Date.now(),
          sentDate: Date.now(),
          status: "enviado",
          recipientEmails: JSON.stringify(input.recipientEmails),
          csvData: input.csvData,
          userId: ctx.user.id,
        });

        return { id: requestId };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["rascunho", "enviado", "confirmado", "cancelado"]),
      }))
      .mutation(async ({ input }) => {
        await updatePurchaseRequest(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // ==================== ORDER INSPECTIONS ====================
  inspections: router({
    getByOrder: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return getOrderInspectionsByOrder(input.orderId);
      }),

    create: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const inspectionId = await createOrderInspection({
          orderId: input.orderId,
          inspectionDate: Date.now(),
          status: "em_andamento",
          notes: input.notes,
          userId: ctx.user.id,
        });
        return { id: inspectionId };
      }),

    addItem: protectedProcedure
      .input(z.object({
        inspectionId: z.number(),
        orderItemId: z.number(),
        quantityExpected: z.number(),
        quantityReceived: z.number(),
        status: z.enum(["ok", "parcial", "faltante", "danificado"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const itemId = await createInspectionItem({
          inspectionId: input.inspectionId,
          orderItemId: input.orderItemId,
          quantityExpected: input.quantityExpected,
          quantityReceived: input.quantityReceived,
          status: input.status,
          notes: input.notes,
        });
        return { id: itemId };
      }),

    getItems: protectedProcedure
      .input(z.object({ inspectionId: z.number() }))
      .query(async ({ input }) => {
        return getInspectionItems(input.inspectionId);
      }),

    complete: protectedProcedure
      .input(z.object({
        inspectionId: z.number(),
        recipientEmails: z.array(z.string().email()),
        csvData: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Atualizar status da inspeção
        await updateOrderInspection(input.inspectionId, {
          status: "concluida",
        });

        // Criar relatório
        const reportId = await createInspectionReport({
          inspectionId: input.inspectionId,
          reportDate: Date.now(),
          sentDate: Date.now(),
          recipientEmails: JSON.stringify(input.recipientEmails),
          csvData: input.csvData,
          status: "enviado",
          userId: ctx.user.id,
        });

         return { id: reportId };
      }),
  }),
  permissions: router({
    initialize: adminProcedure.mutation(async () => {
      await initializePermissions();
      return { success: true };
    }),
    getUserPermissions: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await getUserPermissions(input.userId);
      }),
    updateUserPermission: adminProcedure
      .input(z.object({
        userId: z.number(),
        moduleId: z.number(),
        actionId: z.number(),
        granted: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await updateUserPermissions(input.userId, input.moduleId, input.actionId, input.granted);
        return { success: true };
      }),
    hasPermission: protectedProcedure
      .input(z.object({
        moduleId: z.number(),
        actionId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        return await hasPermission(ctx.user.id, input.moduleId, input.actionId);
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
        origin: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          return { success: true, message: "Se o email existir, um link de reset será enviado" };
        }
        const token = await createPasswordResetToken(user.id);
        const appUrl = input.origin || process.env.APP_URL || "http://localhost:3000";
        await sendPasswordResetEmail(user.email || "", token, appUrl);
        return { success: true, message: "Se o email existir, um link de reset será enviado" };
      }),
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const passwordStrength = validatePasswordStrength(input.newPassword);
        if (!passwordStrength.isValid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Senha fraca: ${passwordStrength.feedback.join(', ')}` });
        }
        const success = await resetPassword(input.token, input.newPassword);
        if (!success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token inválido ou expirado' });
        }
        return { success: true, message: "Senha alterada com sucesso" };
      }),
    verifyEmail: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .mutation(async ({ input }) => {
        const userId = await verifyEmailToken(input.token);
        if (!userId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token inválido ou expirado' });
        }
        return { success: true, message: "Email verificado com sucesso!" };
      }),
  }),
  audit: router({
    list: adminProcedure
      .input(z.object({
        userId: z.number().optional(),
        module: z.string().optional(),
        action: z.string().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await getAuditLogs(input);
      }),
    count: adminProcedure
      .input(z.object({
        userId: z.number().optional(),
        module: z.string().optional(),
        action: z.string().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await getAuditLogCount(input);
      }),
  }),
  permissionTemplates: router({
    getTemplates: protectedProcedure
      .query(async () => {
        return await getPermissionTemplates();
      }),
    applyTemplate: adminProcedure
      .input(z.object({
        userId: z.number(),
        templateId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await applyTemplateToUser(input.userId, input.templateId);
      }),
  }),
  scheduledReports: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        try {
          // Retorna lista vazia até a tabela ser criada
          const reports: any[] = [];
          return reports || [];
        } catch (err) {
          console.log('Tabela de agendamentos ainda não existe');
          return [];
        }
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        frequency: z.enum(['weekly', 'monthly', 'custom']),
        dayOfWeek: z.number().optional(),
        dayOfMonth: z.number().optional(),
        time: z.string(),
        recipientEmails: z.array(z.string().email()),
        includeGraphs: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Funcionalidade será ativada após migração do banco
          return { success: true, id: 0 };
        } catch (err) {
          console.log('Erro ao criar agendamento:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar agendamento' });
        }
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Funcionalidade será ativada após migração do banco
          return { success: true };
        } catch (err) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao deletar agendamento' });
        }
      }),
  }),
  upload: router({
    image: protectedProcedure
      .input(z.object({
        base64: z.string(),
        mimeType: z.string(),
        folder: z.string().default('images'),
      }))
      .mutation(async ({ input }) => {
        const ext = input.mimeType.split('/')[1] || 'png';
        const fileKey = `${input.folder}/${nanoid(12)}.${ext}`;
        const buffer = Buffer.from(input.base64, 'base64');
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url };
      }),
  }),

  dispatches: router({
    create: protectedProcedure
      .input(z.object({
        supplyId: z.number(),
        quantity: z.number().min(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Verificar permissão de criar despacho
          const hasCreatePerm = await checkUserPermission(ctx.user.id, 'despacho_chic', 'create');
          if (!hasCreatePerm) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para criar despachos' });
          }
          
          const result = await createDispatch({
            supplyId: input.supplyId,
            quantity: input.quantity,
            notes: input.notes,
            dispatchedBy: ctx.user.id,
          });
          
          return { success: true, id: result };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('Erro ao criar despacho:', errorMsg);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Erro ao criar despacho: ${errorMsg}` });
        }
      }),
    
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input, ctx }) => {
        try {
          // Verificar permissão de visualizar despachos
          const hasViewPerm = await checkUserPermission(ctx.user.id, 'despacho_chic', 'view');
          if (!hasViewPerm) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para visualizar despachos' });
          }
          
          const dispatches = await getDispatches({
            status: input.status,
            limit: input.limit,
            offset: input.offset,
          });
          return dispatches;
        } catch (err) {
          console.error('Erro ao listar despachos:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao listar despachos' });
        }
      }),
    
    confirm: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Verificar permissão de editar despacho
          const hasEditPerm = await checkUserPermission(ctx.user.id, 'despacho_chic', 'edit');
          if (!hasEditPerm) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para confirmar despachos' });
          }
          
          await confirmDispatch(input.id);
          return { success: true };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('Erro ao confirmar despacho:', errorMsg);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Erro ao confirmar despacho: ${errorMsg}` });
        }
      }),
    
    chicStockSummary: protectedProcedure
      .query(async ({ ctx }) => {
        try {
          // Verificar permissão de visualizar despachos
          const hasViewPerm = await checkUserPermission(ctx.user.id, 'despacho_chic', 'view');
          if (!hasViewPerm) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para visualizar despachos' });
          }
          
          const summary = await getChicStockSummary();
          return summary;
        } catch (err) {
          console.error('Erro ao obter resumo de estoque CHIC:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao obter resumo de estoque CHIC' });
        }
      }),
    
    epsonSupplies: protectedProcedure
      .query(async ({ ctx }) => {
        try {
          const supplies = await getEpsonP5000Supplies();
          return supplies;
        } catch (err) {
          console.error('Erro ao obter insumos da EPSON P5000:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao obter insumos da EPSON P5000' });
        }
      }),
    
    chicSupplies: protectedProcedure
      .query(async ({ ctx }) => {
        try {
          const supplies = await getChicSupplies();
          return supplies;
        } catch (err) {
          console.error('Erro ao obter insumos da CHIC:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao obter insumos da CHIC' });
        }
      }),
    
    registerConsumption: protectedProcedure
      .input(z.object({
        supplyId: z.number(),
        quantity: z.number().min(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Verificar permissão de criar consumo
          const hasCreatePerm = await checkUserPermission(ctx.user.id, 'despacho_chic', 'create');
          if (!hasCreatePerm) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para registrar consumos' });
          }
          const result = await registerChicConsumption({
            supplyId: input.supplyId,
            quantity: input.quantity,
            recordedBy: ctx.user.id,
            notes: input.notes || 'Consumo/Saída CHIC',
            consumptionDate: Date.now(),
          });
          
          return { success: true, id: result };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('Erro ao registrar consumo:', errorMsg);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Erro ao registrar consumo: ${errorMsg}` });
        }
      }),

    getMovementHistory: protectedProcedure
      .query(async () => {
        try {
          const history = await getMovementHistory();
          return history;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('Erro ao obter histórico:', errorMsg);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Erro ao obter histórico: ${errorMsg}` });
        }
      }),

    getMovementHistoryByDate: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        try {
          const history = await getMovementHistoryByDateRange(input.startDate, input.endDate);
          return history;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('Erro ao obter histórico filtrado:', errorMsg);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Erro ao obter histórico: ${errorMsg}` });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;