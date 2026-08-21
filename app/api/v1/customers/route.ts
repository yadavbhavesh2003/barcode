import { NextRequest } from "next/server";
import { connectToDatabase, CustomerModel } from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const filter: any = {};
    if (query) {
      filter.$or = [
        { name: { $regex: query.trim(), $options: "i" } },
        { mobile: { $regex: query.trim(), $options: "i" } },
        { gstin: { $regex: query.trim(), $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      CustomerModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CustomerModel.countDocuments(filter),
    ]);

    return sendSuccess(customers, 200, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    return sendError("CUSTOMER_FETCH_FAILED", error.message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, mobile, email, address, gstin, companyName, notes } = body;

    if (!name || !mobile) {
      return sendError("MISSING_FIELDS", "Customer name and mobile number are required", null, 400);
    }

    let customer = await CustomerModel.findOne({ mobile: mobile.trim() });
    if (customer) {
      customer.name = name.trim();
      if (email !== undefined) customer.email = email.trim();
      if (address !== undefined) customer.address = address.trim();
      if (gstin !== undefined) customer.gstin = gstin.trim();
      if (companyName !== undefined) customer.companyName = companyName.trim();
      if (notes !== undefined) customer.notes = notes.trim();
      await customer.save();
    } else {
      customer = await CustomerModel.create({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email?.trim(),
        address: address?.trim(),
        gstin: gstin?.trim(),
        companyName: companyName?.trim(),
        notes: notes?.trim(),
      });
    }

    return sendSuccess(customer, 201);
  } catch (error: any) {
    return sendError("CUSTOMER_SAVE_FAILED", error.message, null, 400);
  }
}
