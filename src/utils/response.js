/**
 * Unified API response helpers.
 *
 * Shape:
 *   { status: "SUCCESS" | "FAILURE", message: string, data?: any }
 *
 * `data` is only included in the response when it is provided and not null/undefined.
 */

const sendSuccess = (res, message = 'Request successful', data, statusCode = 200) => {
  const body = { status: 'SUCCESS', message };
  if (data !== undefined && data !== null) body.data = data;
  return res.status(statusCode).json(body);
};

const sendFailure = (res, message = 'Something went wrong', statusCode = 500) => {
  return res.status(statusCode).json({ status: 'FAILURE', message });
};

module.exports = { sendSuccess, sendFailure };
