import { NextResponse } from "next/server";
import { ApiResponse } from "../types";

export function sendSuccess<T>(
  data: T,
  statusOrPagination?: number | any,
  paginationParam?: any
) {
  let status = 200;
  let pagination = paginationParam;

  if (typeof statusOrPagination === "number") {
    status = statusOrPagination;
  } else if (statusOrPagination && typeof statusOrPagination === "object") {
    pagination = statusOrPagination;
  }

  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(pagination ? { pagination } : {}),
  };

  return NextResponse.json(body, { status });
}

export function sendError(
  code: string,
  message: string,
  details: any = null,
  status: number = 400
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const body: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    requestId,
  };
  return NextResponse.json(body, { status });
}
