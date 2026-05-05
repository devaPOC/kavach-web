"use client";

import React, { type ReactNode, useEffect, useRef } from 'react';
import gsap from 'gsap';

interface AuthScreenProps {
	title: string;
	subtitle?: string;
	children: ReactNode;
	footer?: ReactNode;
	pill?: string;
	role?: 'customer' | 'expert';
}

const AuthScreen: React.FC<AuthScreenProps> = ({
	title = "",
	subtitle,
	children,
	footer,
	pill,
	role = 'customer'
}) => {
	const topOrbRef = useRef<HTMLDivElement | null>(null);
	const bottomOrbRef = useRef<HTMLDivElement | null>(null);

	const isExpert = role === 'expert';
	const topColor = isExpert ? '#14b8a6' : '#2563eb';
	const bottomColor = isExpert ? '#2563eb' : '#14b8a6';
	const positions = {
		customer: {
			top: { x: 0, y: 0 },
			bottom: { x: 0, y: 0 }
		},
		expert: {
			top: { x: 120, y: 40 },
			bottom: { x: -120, y: -40 }
		}
	};

	useEffect(() => {
		const ctx = gsap.context(() => {
			if (topOrbRef.current) {
				gsap.fromTo(
					topOrbRef.current,
					{ opacity: 0.8, y: -12, scale: 0.96 },
					{ opacity: 1, y: 0, scale: 1.04, duration: 7, ease: 'sine.inOut', repeat: -1, yoyo: true }
				);
			}

			if (bottomOrbRef.current) {
				gsap.fromTo(
					bottomOrbRef.current,
					{ opacity: 0.7, y: 10, scale: 0.95 },
					{ opacity: 1, y: 0, scale: 1.05, duration: 8.5, ease: 'sine.inOut', repeat: -1, yoyo: true }
				);
			}
		});

		return () => ctx.revert();
	}, []);

	useEffect(() => {
		const targetTop = positions[role].top;
		const targetBottom = positions[role].bottom;

		if (topOrbRef.current) {
			gsap.killTweensOf(topOrbRef.current);
			gsap.timeline({ defaults: { ease: 'power2.inOut' } })
				.to(topOrbRef.current, {
					x: targetTop.x,
					y: targetTop.y,
					scale: 1.05,
					duration: 1.0
				})
				.to(topOrbRef.current, {
					scale: 1,
					duration: 0.25
				}, '-=0.4')
				.to(topOrbRef.current, {
					backgroundColor: topColor,
					opacity: 0.22,
					duration: 0.45
				});
		}

		if (bottomOrbRef.current) {
			gsap.killTweensOf(bottomOrbRef.current);
			gsap.timeline({ defaults: { ease: 'power2.inOut' } })
				.to(bottomOrbRef.current, {
					x: targetBottom.x,
					y: targetBottom.y,
					scale: 1.04,
					duration: 1.0
				})
				.to(bottomOrbRef.current, {
					scale: 1,
					duration: 0.25
				}, '-=0.35')
				.to(bottomOrbRef.current, {
					backgroundColor: bottomColor,
					opacity: 0.22,
					duration: 0.45
				});
		}
	}, [role, topColor, bottomColor]);

	useEffect(() => {
		const elements = [topOrbRef.current, bottomOrbRef.current].filter(Boolean) as HTMLDivElement[];
		if (!elements.length) return;
		elements.forEach((el, idx) => {
			gsap.fromTo(
				el,
				{ rotate: 0 },
				{
					rotate: idx === 0 ? 360 : -360,
					duration: 1.2,
					ease: 'power2.inOut',
					onComplete: () => { gsap.set(el, { clearProps: 'rotate' }); }
				}
			);
		});
	}, [role]);

	return (
		<div className="relative min-h-screen overflow-hidden bg-[#0b1021] text-white">
			<div className="pointer-events-none absolute inset-0">
				<div
					ref={topOrbRef}
					className="absolute -left-24 -top-48 h-[420px] w-[420px] rounded-full blur-3xl"
					style={{ backgroundColor: topColor, opacity: 0.2 }}
				/>
				<div
					ref={bottomOrbRef}
					className="absolute -right-16 bottom-0 h-[360px] w-[360px] rounded-full blur-3xl"
					style={{ backgroundColor: bottomColor, opacity: 0.2 }}
				/>
			</div>

			<div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
				<div className="w-full max-w-3xl space-y-8 text-center">
					<div className="flex flex-col items-center gap-3">
						<div className="text-4xl font-bold tracking-tight text-white drop-shadow-2xl font-sans uppercase">
							Kavach
						</div>

						{pill ? (
							<div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[2px] text-white/90">
								{pill}
							</div>
						) : null}

						<div className="space-y-2">

							<h1 className="text-3xl font-semibold tracking-tight text-white hidden">{title}</h1>
							{subtitle ? (
								<p className="text-base leading-6 text-slate-200 hidden">{subtitle}</p>
							) : null}
						</div>
					</div>

					<div className="mx-auto w-full max-w-2xl">
						{children}
					</div>

					{footer ? (
						<div className="text-slate-200">
							{footer}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
};

export default AuthScreen;
