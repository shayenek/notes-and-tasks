import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { pusherServerClient } from '~/server/pusher';

export const patternRouter = createTRPCRouter({
	getCategories: protectedProcedure.query(async ({ ctx }) => {
		const categories = await ctx.prisma.category.findMany();

		return categories;
	}),
	createNewCategory: protectedProcedure
		.input(
			z.object({
				name: z.string(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const lastCategoryInDatabase = await ctx.prisma.category.findFirst({
				orderBy: { id: 'desc' },
			});

			const newCategoryId = (lastCategoryInDatabase?.id || 0) + 1;

			const newCategory = await ctx.prisma.category.create({
				data: { id: newCategoryId, name: input.name },
			});

			return newCategory;
		}),
	search: protectedProcedure
		.input(
			z.object({
				searchTerm: z.string(),
			})
		)
		.query(async ({ input, ctx }) => {
			const searchResults = await ctx.prisma.pattern.findMany({
				where: {
					name: {
						contains: input.searchTerm,
					},
				},
			});

			return searchResults;
		}),
	getAllItems: protectedProcedure.query(async ({ ctx }) => {
		const allItems = await ctx.prisma.pattern.findMany();

		return allItems;
	}),
	getAllItemsWithoutShoppingItems: protectedProcedure.query(async ({ ctx }) => {
		const shoppingItemsIds = (await ctx.prisma.item.findMany()).map((item) => item.id);

		return ctx.prisma.pattern.findMany({
			where: { id: { notIn: shoppingItemsIds } },
			orderBy: { weight: 'desc' },
		});
	}),
	createNewItem: protectedProcedure
		.input(
			z.object({
				createNewShoppingItem: z.boolean(),
				dataBaseObject: z.object({
					name: z.string(),
					categoryId: z.number(),
					quantity: z.number(),
				}),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const lastItemInDatabase = await ctx.prisma.pattern.findFirst({
				orderBy: { id: 'desc' },
			});

			const newItemId = (lastItemInDatabase?.id || 0) + 1;

			const newDataBaseObject = {
				id: newItemId,
				name: input.dataBaseObject.name,
				categoryId: input.dataBaseObject.categoryId,
				location: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				weight: 1,
				price: 0,
			};

			const newItem = await ctx.prisma.pattern.create({
				data: newDataBaseObject,
			});

			if (input.createNewShoppingItem) {
				await ctx.prisma.item.create({
					data: {
						...newDataBaseObject,
						quantity: input.dataBaseObject.quantity,
						checked: false,
					},
				});
			}

			return newItem;
		}),

	getItemByName: protectedProcedure
		.input(
			z.object({
				name: z.string(),
			})
		)
		.query(async ({ input, ctx }) => {
			const itemName = input.name;

			const item = await ctx.prisma.pattern.findFirst({
				where: {
					name: itemName,
				},
			});

			if (!item) {
				throw new Error('Item not found');
			}

			return item;
		}),
	setAllItemsWeightToOne: protectedProcedure.mutation(async ({ ctx }) => {
		await ctx.prisma.pattern.updateMany({
			where: {},
			data: {
				weight: 1,
			},
		});

		return true;
	}),
	setItemWeight: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				weight: z.number(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { id, weight } = input;

			const updatedItem = await ctx.prisma.pattern.update({
				where: { id },
				data: { weight },
			});

			if (!updatedItem) throw new Error('Item not found');

			return updatedItem;
		}),
	deleteItem: protectedProcedure
		.input(
			z.object({
				id: z.number(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { id } = input;

			const deletedItem = await ctx.prisma.pattern.delete({
				where: { id },
			});

			if (!deletedItem) throw new Error('Item not found');

			return deletedItem;
		}),
	setItemPrice: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				price: z.number(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { id, price } = input;

			const updatedItem = await ctx.prisma.pattern.update({
				where: { id },
				data: { price },
			});

			if (!updatedItem) throw new Error('Item not found');

			return updatedItem;
		}),
});

export const itemRouter = createTRPCRouter({
	getAllItems: protectedProcedure.query(async ({ ctx }) => {
		const allItems = await ctx.prisma.item.findMany({
			orderBy: {
				createdAt: 'asc',
			},
		});

		return allItems;
	}),
	getAllShoppingItemsSortedByDatabaseItemsWeight: protectedProcedure.query(async ({ ctx }) => {
		const allShoppingItems = await ctx.prisma.item.findMany({
			orderBy: {
				createdAt: 'asc',
			},
		});

		const allDatabaseItems = await ctx.prisma.pattern.findMany();

		const sortedItems = allShoppingItems.sort((a, b) => {
			const aWeight = allDatabaseItems.find((item) => item.id === a.id)?.weight;
			const bWeight = allDatabaseItems.find((item) => item.id === b.id)?.weight;
			if (aWeight && bWeight) {
				return bWeight - aWeight;
			}
			return 0;
		});

		return sortedItems;
	}),
	addItemToList: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				quantity: z.number(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { id, quantity } = input;

			const item = await ctx.prisma.pattern.findUnique({
				where: { id },
			});

			if (!item) throw new Error('Item not found');

			const newshoppingItem = await ctx.prisma.item.create({
				data: {
					id,
					name: item.name,
					quantity,
					categoryId: item.categoryId,
					checked: false,
					price: 0,
				},
			});

			await ctx.prisma.pattern.update({
				where: { id },
				data: { weight: Number(item.weight) + 1 },
			});

			await pusherServerClient.trigger(`user-shayenek`, 'new-shopping-item', {
				shoppingItem: newshoppingItem,
			});

			return { id, weight: Number(item.weight) + 1 };
		}),

	checkItem: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				checked: z.boolean(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { id, checked } = input;

			const newItem = await ctx.prisma.item.update({
				where: { id },
				data: { checked },
			});

			if (!newItem) throw new Error('Item not found');

			await pusherServerClient.trigger(`user-shayenek`, 'shopping-item-checked', {
				shoppingItem: newItem,
			});

			return newItem;
		}),
	markAllChecked: protectedProcedure.mutation(async ({ ctx }) => {
		await ctx.prisma.item.updateMany({
			where: {},
			data: {
				checked: true,
			},
		});

		return true;
	}),
	deleteItemFromList: protectedProcedure
		.input(
			z.object({
				id: z.number(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { id } = input;

			const deletedItem = await ctx.prisma.item.delete({
				where: { id },
			});

			if (!deletedItem) throw new Error('Item not found');

			await pusherServerClient.trigger(`user-shayenek`, 'shopping-item-deleted', {
				shoppingItem: deletedItem,
			});

			return deletedItem;
		}),

	updateItemQuantity: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				quantity: z.number(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { id, quantity } = input;

			const updatedItem = await ctx.prisma.item.update({
				where: { id },
				data: { quantity },
			});

			if (!updatedItem) throw new Error('Item not found');

			await pusherServerClient.trigger(`user-shayenek`, 'shopping-item-quantityUpdate', {
				shoppingItem: updatedItem,
			});

			return updatedItem;
		}),
	clearItems: protectedProcedure.mutation(async ({ ctx }) => {
		await ctx.prisma.item.deleteMany({});

		await pusherServerClient.trigger(`user-shayenek`, 'shopping-items-cleared', {
			shoppingItem: null,
		});

		return true;
	}),
});
