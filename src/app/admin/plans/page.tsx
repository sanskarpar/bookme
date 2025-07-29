"use client";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import Navbar from "../../../components/adminnavbar";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function PlansPage() {
	const [user, setUser] = useState<any>(null);
	const [salon, setSalon] = useState<any>(null);
	const [plans, setPlans] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			setUser(firebaseUser);
			if (firebaseUser?.email) {
				try {
					// Fetch salon info to get current plan
					const salonRes = await fetch(`/api/salons?email=${encodeURIComponent(firebaseUser.email)}`);
					if (salonRes.ok) {
						const salonData = await salonRes.json();
						setSalon(salonData.salon || salonData);
					}
				} catch (err) {
					console.error("Error fetching salon data:", err);
				}
			}
			
			// Fetch plans from API
			try {
				const plansRes = await fetch('/api/plans');
				if (plansRes.ok) {
					const plansData = await plansRes.json();
					setPlans(plansData.plans || []);
				}
			} catch (err) {
				console.error("Error fetching plans:", err);
			}
			
			setLoading(false);
		});
		return () => unsubscribe();
	}, []);

	const handlePlanSelect = async (planId: string) => {
		if (!salon?.email) return;
		
		try {
			// For now, just show a message. In the future, integrate with payment system
			const selectedPlan = plans.find(p => p.id === planId);
			alert(`Plan-Upgrade zu ${selectedPlan?.name || planId} wird demnächst verfügbar sein. Kontaktieren Sie uns für sofortiges Upgrade.`);
		} catch (error) {
			console.error("Error upgrading plan:", error);
		}
	};

	const currentPlan = salon?.plan || "founders";

	if (loading) {
		return (
			<div style={{ 
				display: "flex", 
				justifyContent: "center", 
				alignItems: "center", 
				minHeight: "100vh",
				color: "#111"
			}}>
				Laden...
			</div>
		);
	}

	return (
		<>
			<Navbar 
				user={user} 
				currentPath="/admin/plans" 
				salon={salon}
			/>
			<div
				style={{
					maxWidth: 900,
					margin: "0 auto",
					padding: "2rem 1rem",
					color: "#111",
				}}
			>
				{/* Back Button */}
				<button
					onClick={() => window.history.back()}
					style={{
						background: "#fff",
						color: "#111",
						border: "1px solid #e0a96d",
						borderRadius: 6,
						padding: "0.4rem 1.1rem",
						fontWeight: 600,
						fontSize: "1rem",
						cursor: "pointer",
						marginBottom: 24,
						boxShadow: "0 1px 4px #0001",
					}}
				>
					← Zurück
				</button>
				
				{/* Current Plan Status */}
				{salon && (
					<div
						style={{
							background: "#5C6F68",
							color: "#fff",
							borderRadius: 10,
							padding: "1.2rem 1.5rem",
							marginBottom: 24,
							fontWeight: 600,
							fontSize: "1.15rem",
							boxShadow: "0 2px 8px #0001",
							textAlign: "center",
						}}
					>
						<span>
							Ihr aktueller Plan: <b>{plans.find(p => p.id === currentPlan)?.name || "Founders Plan"}</b>
						</span>
					</div>
				)}

				{/* Promo Banner */}
				<div
					style={{
						background: "#e0a96d",
						color: "#111",
						borderRadius: 10,
						padding: "1.2rem 1.5rem",
						marginBottom: 32,
						fontWeight: 600,
						fontSize: "1.15rem",
						boxShadow: "0 2px 8px #0001",
						textAlign: "center",
					}}
				>
					<span>
						<b>Gründeraktion:</b> Alle Kunden, die sich bis zum 1. Juli 2025
						registrieren, erhalten den <b>Founders Plan</b> für 2 Monate{" "}
						<u>komplett kostenlos</u> und ohne jegliche Einschränkungen!
					</span>
				</div>
				<h1
					style={{
						textAlign: "center",
						marginBottom: 24,
						color: "#111",
					}}
				>
					Unsere Pläne
				</h1>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: 24,
						justifyContent: "center",
						color: "#111",
						alignItems: "stretch",
					}}
				>
					{plans.map((plan) => {
						const isCurrentPlan = plan.id === currentPlan;
						const isFoundersPlan = plan.id === 'founders';
						const isHighlighted = plan.price === 0 || plan.price >= 99; // Highlight free or premium plans
						
						return (
							<div
								key={plan.id}
								style={{
									background: "#fff",
									border: isHighlighted || isCurrentPlan
										? "2px solid #e0a96d"
										: "1px solid #eee",
									borderRadius: 12,
									boxShadow: isHighlighted || isCurrentPlan
										? "0 4px 16px #e0a96d22"
										: "0 2px 8px #0001",
									minWidth: 260,
									maxWidth: 320,
									flex: "1 1 260px",
									padding: "2rem 1.2rem 1.2rem 1.2rem",
									position: "relative",
									marginBottom: 16,
									color: "#111",
									display: "flex",
									flexDirection: "column",
									justifyContent: "flex-start",
									height: 420,
								}}
							>
								{/* Nur für Gründer removed */}
								{/* Current plan indicator */}
								{isCurrentPlan && (
									<div
										style={{
											position: "absolute",
											top: -18,
											right: 12,
											background: "#22c55e",
											color: "#fff",
											borderRadius: 8,
											padding: "0.2rem 0.8rem",
											fontWeight: 700,
											fontSize: "0.85rem",
											boxShadow: "0 1px 4px #0002",
										}}
									>
										Aktiv
									</div>
								)}
								<h2
									style={{
										color: "#111",
										fontWeight: 700,
										marginBottom: 8,
									}}
								>
									{plan.name}
								</h2>
								<div
									style={{
										fontSize: "1.5rem",
										fontWeight: 700,
										color: "#e0a96d",
										marginBottom: 4,
									}}
								>
									€{plan.price}/Monat
								</div>
								<div
									style={{
										fontSize: "1.05rem",
										color: "#111",
										marginBottom: 12,
									}}
								>
									{plan.description}
								</div>
								<ul
									style={{
										paddingLeft: 18,
										marginBottom: 18,
										color: "#111",
									}}
								>
									{plan.features?.map((feature: string, idx: number) => (
										<li key={idx} style={{ marginBottom: 6 }}>
											{feature}
										</li>
									))}
								</ul>
								{/* Spacer to push button to bottom */}
								<div style={{ flex: 1 }} />
								{!isFoundersPlan && !isCurrentPlan && (
									<button
										onClick={() => handlePlanSelect(plan.id)}
										style={{
											background: "#e0a96d",
											color: "#fff",
											border: "none",
											borderRadius: 6,
											padding: "0.5rem 1.2rem",
											fontWeight: 600,
											fontSize: "1rem",
											cursor: "pointer",
											marginTop: 8,
											width: "100%",
											textAlign: "center",
										}}
									>
										Upgrade
									</button>
								)}
								{isCurrentPlan && (
									<div
										style={{
											color: "#22c55e",
											fontWeight: 600,
											fontSize: "1rem",
											marginTop: 8,
											minHeight: 38,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										✓ Ihr aktueller Plan
									</div>
								)}
								{isFoundersPlan && !isCurrentPlan && (
									<div
										style={{
											color: "#111",
											fontWeight: 500,
											fontSize: "0.98rem",
											marginTop: 8,
											minHeight: 38,
											display: "flex",
											alignItems: "flex-end",
										}}
									>
										Automatisch für alle neuen Kunden aktiviert!
									</div>
								)}
							</div>
						);
					})}
					{/* Custom Plan */}
					<div
						style={{
							background: "#fff",
							border: "1px dashed #e0a96d",
							borderRadius: 12,
							boxShadow: "0 2px 8px #0001",
							minWidth: 260,
							maxWidth: 320,
							flex: "1 1 260px",
							padding: "2rem 1.2rem 1.2rem 1.2rem",
							marginBottom: 16,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "flex-start",
							color: "#111",
							height: 420,
						}}
					>
						<h2
							style={{
								color: "#111",
								fontWeight: 700,
								marginBottom: 8,
							}}
						>
							Custom Plan
						</h2>
						<div
							style={{
								fontSize: "1.05rem",
								color: "#111",
								marginBottom: 12,
							}}
						>
							Sie haben ein hohes Buchungsvolumen?
						</div>
						<div
							style={{
								color: "#e0a96d",
								fontWeight: 600,
								marginBottom: 12,
							}}
						>
							Kontaktieren Sie uns, wir finden eine Lösung!
						</div>
						<div style={{ flex: 1 }} />
						<a
							href="mailto:info@bookme.com"
							style={{
								background: "#e0a96d",
								color: "#fff",
								border: "none",
								borderRadius: 6,
								padding: "0.5rem 1.2rem",
								fontWeight: 600,
								fontSize: "1rem",
								textDecoration: "none",
								marginTop: 8,
								width: "100%",
								textAlign: "center",
								display: "block",
							}}
						>
							Kontakt aufnehmen
						</a>
					</div>
				</div>
			</div>
		</>
	);
}