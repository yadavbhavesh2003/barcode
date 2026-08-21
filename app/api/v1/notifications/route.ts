import { NextRequest } from "next/server";
import { connectToDatabase, NotificationModel, ProductModel, InvoiceModel } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/auth";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getAuthUser();

    // 1. Fetch DB notifications
    const dbNotifications = await NotificationModel.find().sort({ createdAt: -1 }).limit(10).lean();

    // 2. Synthesize low stock alerts
    const lowStockCount = await ProductModel.countDocuments({
      status: "active",
      $expr: { $lte: ["$currentStock", "$minStock"] },
    });

    const dynamicAlerts: any[] = [];
    if (lowStockCount > 0) {
      dynamicAlerts.push({
        _id: "dyn-low-stock",
        title: "Low Stock Inventory Alert",
        message: `${lowStockCount} product(s) have fallen below their minimum safety stock threshold.`,
        type: "warning",
        category: "stock",
        isRead: false,
        link: "/inventory",
        createdAt: new Date(),
      });
    }

    // 3. Combine notifications
    const allNotifications = [...dynamicAlerts, ...dbNotifications];
    const unreadCount = allNotifications.filter((n) => !n.isRead).length;

    return sendSuccess({
      notifications: allNotifications,
      unreadCount,
    });
  } catch (error: any) {
    return sendError("NOTIFICATIONS_FETCH_FAILED", error.message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await NotificationModel.updateMany({}, { isRead: true });
      return sendSuccess({ message: "All notifications marked as read." });
    }

    if (notificationId && !notificationId.startsWith("dyn-")) {
      await NotificationModel.findByIdAndUpdate(notificationId, { isRead: true });
    }

    return sendSuccess({ message: "Notification marked as read." });
  } catch (error: any) {
    return sendError("NOTIFICATION_UPDATE_FAILED", error.message, null, 500);
  }
}
