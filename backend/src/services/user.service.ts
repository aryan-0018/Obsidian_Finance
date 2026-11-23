import BudgetModel from "../models/budget.model";
import UserModel from "../models/user.model";
import { NotFoundException } from "../utils/app-error";
import { assertValidReceiptFile } from "../utils/file-validation";
import { UpdateUserType } from "../validators/user.validator";

export const findByIdUserService = async (userId: string) => {
  const user = await UserModel.findById(userId);
  return user?.omitPassword();
};

export const updateUserService = async (
  userId: string,
  body: UpdateUserType,
  profilePic?: Express.Multer.File
) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundException("User not found");

  if (profilePic) {
    if (profilePic.buffer) {
      assertValidReceiptFile(profilePic.buffer, false);
    }
    if (profilePic.path) {
      user.profilePicture = profilePic.path;
    }
  }

  user.set({
    name: body.name !== undefined ? body.name : user.name,
    portfolioBalance:
      body.portfolioBalance !== undefined
        ? body.portfolioBalance
        : user.portfolioBalance,
    currency: body.currency !== undefined ? body.currency : user.currency,
  });

  await user.save();

  if (body.currency !== undefined) {
    await BudgetModel.updateOne(
      { userId: user._id },
      { $set: { currency: body.currency } }
    );
  }

  return user.omitPassword();
};
