import React, {useState, useEffect} from 'react';
import {Text} from 'ink';

interface BlinkingDotProps {
	color?: string;
}

export default function BlinkingDot({color = 'green'}: BlinkingDotProps) {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const interval = setInterval(() => {
			setVisible(prev => !prev);
		}, 500);

		return () => clearInterval(interval);
	}, []);

	return <Text color={color}>{visible ? '●' : ' '}</Text>;
}
