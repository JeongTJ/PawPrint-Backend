
const a = async () => {
	try {
		const { id } = req.query;
		if (!id) {
			return res.status(400).json({ error: 'User ID must be provided as a query parameter.' });
		}
	
		const member = await membersServices.findById(id);
		if (!member) {
			return res.status(404).json({ error: `Member with id ${id} not found.` });
		}
	
		if (!process.env.JWT_SECRET) {
			console.error('JWT_SECRET is not set in environment variables.');
			return res.status(500).json({ error: 'JWT secret is not configured.' });
		}
		
		const token = jwt.sign({ id: parseInt(id, 10) }, process.env.JWT_SECRET, {
			expiresIn: '1h',
		});
	
		res.json({ token });
	} catch (error) {
		console.error('Error generating test token:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
}