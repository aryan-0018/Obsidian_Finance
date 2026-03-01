import BudgetModel from "../models/budget.model";

export const getBudgetService = async (userId: string) => {
    let budget = await BudgetModel.findOne({ userId });

    if (!budget) {
        // Create a default budget profile if one doesn't exist
        budget = await BudgetModel.create({
            userId,
            limit: 0,
        });
    }

    return budget;
};

export const updateBudgetService = async (userId: string, limit: number) => {
    const budget = await BudgetModel.findOneAndUpdate(
        { userId },
        { limit },
        { new: true, upsert: true }
    );
    return budget;
};
