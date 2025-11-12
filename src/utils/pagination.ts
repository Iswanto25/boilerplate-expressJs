export const paginate = (page: number = 1, limit: number = 10, totalData: number = 0) => {
	const take = limit;
	const skip = (page - 1) * limit;
	const totalPages = Math.ceil(totalData / limit);

	return {
		skip,
		take,
		pagination: {
			currentPage: page,
			totalPages: totalPages || 1,
			totalData,
			limit,
		},
	};
};
