import { Op } from "sequelize";
import idempotencyKeyModel, {
  IdempotencyKeyEnum,
} from "../db/models/idempotencyKey.model";

const TEN_MINUTES = 10 * 60 * 1000;

// Runs every 10 minutes
setInterval(async () => {
  try {
    const [updatedCount] = await idempotencyKeyModel.update(
      {
        status: IdempotencyKeyEnum.FAILED,
        response: {
          message: "Request timed out",
          statusCode: 500,
          success: false,
        },
      },
      {
        where: {
          status: IdempotencyKeyEnum.PROCESSING,
          createdAt: {
            [Op.lt]: new Date(Date.now() - TEN_MINUTES),
          },
        },
      }
    );

    console.log(`Marked ${updatedCount} stuck keys as FAILED`);
  } catch (error) {
    console.error("Failed to process stuck idempotency keys:", error);
  }
}, 5 * 60 * 1000);
