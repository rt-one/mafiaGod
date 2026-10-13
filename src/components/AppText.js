import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';

export default function AppText({ style, children, weight = 'regular', ...props }) {
	let selectedFont = 'Ray-Medium';
	if (weight === 'light') selectedFont = 'Ray-Light';
	if (weight === 'bold') selectedFont = 'Ray-Black';
	if (weight === 'extraBold') selectedFont = 'Ray-ExtraBlack';

	return (
		<RNText style={[{ fontFamily: selectedFont }, style]} {...props}>
			{children}
		</RNText>
	);
}
