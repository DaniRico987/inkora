import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InputText, InputPassword, InputSelect } from '../Components/Inputs';
import { Button } from '../Components/Button';
import { useTheme } from '../theme/useTheme';
import { extractAuthError, register } from '../api/auth';

export function RegisterPage() {
	useTheme();

	const [formData, setFormData] = useState({
		dni: '',
		firstName: '',
		lastName: '',
		birthDate: '',
		birthPlace: '',
		address: '',
		gender: '',
		email: '',
		username: '',
		password: '',
		confirmPassword: '',
	});

	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const validateForm = (): boolean => {
		const { dni, firstName, lastName, birthDate, email, username, password, confirmPassword } =
			formData;

		if (!dni.trim() || !firstName.trim() || !lastName.trim() || !birthDate || !email.trim() || !username.trim() || !password.trim()) {
			setErrorMessage('Por favor completa todos los campos requeridos.');
			return false;
		}

		if (dni.length < 6 || dni.length > 20) {
			setErrorMessage('El DNI debe tener entre 6 y 20 caracteres.');
			return false;
		}

		if (firstName.length > 100) {
			setErrorMessage('El nombre no debe exceder 100 caracteres.');
			return false;
		}

		if (lastName.length > 100) {
			setErrorMessage('El apellido no debe exceder 100 caracteres.');
			return false;
		}

		const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
		if (!validEmail) {
			setErrorMessage('Ingresa un correo electrónico válido.');
			return false;
		}

		if (username.length < 3 || username.length > 50) {
			setErrorMessage('El nombre de usuario debe tener entre 3 y 50 caracteres.');
			return false;
		}

		if (!/^[a-zA-Z0-9_]+$/.test(username)) {
			setErrorMessage('El nombre de usuario solo puede contener letras, números y guiones bajos.');
			return false;
		}

		if (password.length < 8) {
			setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
			return false;
		}

		if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
			setErrorMessage(
				'La contraseña debe incluir mayúsculas, minúsculas y números.',
			);
			return false;
		}

		if (password !== confirmPassword) {
			setErrorMessage('Las contraseñas no coinciden.');
			return false;
		}

		return true;
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage('');
		setSuccessMessage('');

		if (!validateForm()) {
			return;
		}

		setLoading(true);
		try {
			await register({
				dni: formData.dni.trim(),
				firstName: formData.firstName.trim(),
				lastName: formData.lastName.trim(),
				birthDate: formData.birthDate,
				birthPlace: formData.birthPlace.trim() || undefined,
				address: formData.address.trim() || undefined,
				gender: formData.gender || undefined,
				email: formData.email.trim(),
				username: formData.username.trim(),
				password: formData.password,
			});

			setSuccessMessage('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
			setFormData({
				dni: '',
				firstName: '',
				lastName: '',
				birthDate: '',
				birthPlace: '',
				address: '',
				gender: '',
				email: '',
				username: '',
				password: '',
				confirmPassword: '',
			});
		} catch (error) {
			const authError = extractAuthError(error);
			setErrorMessage(
				authError.message || 'No se pudo crear la cuenta. Verifica la información e intenta de nuevo.',
			);
		} finally {
			setLoading(false);
		}
	};

	const genderOptions = [
		{ value: '', label: 'Selecciona tu género' },
		{ value: 'male', label: 'Masculino' },
		{ value: 'female', label: 'Femenino' },
		{ value: 'other', label: 'Otro' },
		{ value: 'prefer_not_say', label: 'Prefiero no decir' },
	];

	return (
		<div className="w-full flex items-center justify-center px-4 py-8 md:py-10">
			<div className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-white/30 bg-white/10 shadow-2xl backdrop-blur-2xl">
				<div className="grid md:grid-cols-2 min-h-auto md:min-h-144">
					<div className="relative isolate overflow-hidden bg-bg-secondary">
						<div className="absolute left-0 top-0 z-20 h-96 w-96 sm:h-136 sm:w-136 -translate-x-1/4 -translate-y-1/4 rounded-full bg-linear-to-br from-skyblue-100 via-skyblue-300 to-primary-600 border border-white/55 shadow-[inset_-26px_-26px_52px_rgba(10,35,85,0.35),inset_22px_22px_42px_rgba(255,255,255,0.28),0_16px_35px_rgba(22,63,136,0.28)]">
							<span className="absolute left-[18%] top-[15%] h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/40 blur-[1px]" />
							<div className="absolute left-[58%] top-[58%] w-44 sm:w-56 -translate-x-1/2 -translate-y-1/2 pr-2">
								<h2 className="text-xl sm:text-3xl font-semibold leading-tight text-white">
									¡Únete a Inkora!
								</h2>
								<p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/90">
									Acceso a miles de libros y únete a una comunidad de lectores apasionados.
								</p>
							</div>
						</div>

						<div className="absolute left-[31%] top-[52%] z-30 h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-linear-to-br from-skyblue-100 via-skyblue-300 to-primary-600 border border-white/55 shadow-[inset_-18px_-18px_34px_rgba(10,35,85,0.3),inset_12px_12px_20px_rgba(255,255,255,0.28),0_12px_24px_rgba(22,63,136,0.2)]">
							<span className="absolute left-[16%] top-[14%] h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/35 blur-[1px]" />
						</div>

						<div className="absolute left-[3%] bottom-[8%] z-10 h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-linear-to-br from-skyblue-100 via-skyblue-300 to-primary-600 border border-white/55 shadow-[inset_-14px_-14px_26px_rgba(10,35,85,0.28),inset_10px_10px_16px_rgba(255,255,255,0.26),0_10px_20px_rgba(22,63,136,0.2)]">
							<span className="absolute left-[18%] top-[14%] h-6 w-6 rounded-full bg-white/35 blur-[1px]" />
						</div>
					</div>

					<div className="px-6 py-8 sm:px-9 sm:py-10 md:px-10 md:py-12 bg-bg-secondary overflow-y-auto max-h-screen md:max-h-none">
						<p className="text-xs uppercase tracking-[0.16em] text-text-muted mb-2">
							Creación de cuenta
						</p>
						<h1 className="text-2xl sm:text-3xl font-semibold text-text mb-2">
							Crear cuenta
						</h1>
						<p className="text-sm text-text-muted mb-6">
							Completa el formulario para acceder a tu mundo de lectura.
						</p>

						<form
							onSubmit={handleSubmit}
							className="space-y-4 [&_input]:border-border [&_input]:bg-bg-input [&_input]:text-text [&_input]:placeholder:text-placeholder [&_input]:focus:border-border-focus [&_input]:shadow-none [&_label>span:first-of-type]:border-border [&_label>span:last-of-type]:text-label [&_select]:border-border [&_select]:bg-bg-input [&_select]:text-text [&_select]:focus:border-border-focus [&_select]:shadow-none"
						>
							{/* Row 1: DNI, First Name, Last Name */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
								<div>
									<InputText
										label="DNI"
										name="dni"
										type="text"
										autoComplete="off"
										value={formData.dni}
										onChange={handleInputChange}
										maxLength={20}
									/>
								</div>
								<div>
									<InputText
										label="Nombre"
										name="firstName"
										type="text"
										autoComplete="given-name"
										value={formData.firstName}
										onChange={handleInputChange}
										maxLength={100}
									/>
								</div>
								<div>
									<InputText
										label="Apellido"
										name="lastName"
										type="text"
										autoComplete="family-name"
										value={formData.lastName}
										onChange={handleInputChange}
										maxLength={100}
									/>
								</div>
							</div>

							{/* Row 2: Birth Date, Gender */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
								<div>
									<InputText
										label="Fecha de nacimiento"
										name="birthDate"
										type="date"
										value={formData.birthDate}
										onChange={handleInputChange}
									/>
								</div>
								<div>
									<InputSelect
										label="Género"
										name="gender"
										options={genderOptions}
										value={formData.gender}
										onChange={handleInputChange}
									/>
								</div>
							</div>

							{/* Row 3: Birth Place, Address */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
								<div>
									<InputText
										label="Lugar de nacimiento"
										name="birthPlace"
										type="text"
										value={formData.birthPlace}
										onChange={handleInputChange}
										maxLength={100}
									/>
								</div>
								<div>
									<InputText
										label="Dirección"
										name="address"
										type="text"
										autoComplete="street-address"
										value={formData.address}
										onChange={handleInputChange}
										maxLength={255}
									/>
								</div>
							</div>

							{/* Row 4: Email, Username */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
								<div>
									<InputText
										label="Correo electrónico"
										name="email"
										type="email"
										autoComplete="email"
										value={formData.email}
										onChange={handleInputChange}
									/>
								</div>
								<div>
									<InputText
										label="Nombre de usuario"
										name="username"
										type="text"
										autoComplete="username"
										value={formData.username}
										onChange={handleInputChange}
										maxLength={50}
									/>
								</div>
							</div>

							{/* Row 5: Password, Confirm Password */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
								<div>
									<InputPassword
										label="Contraseña"
										name="password"
										autoComplete="new-password"
										value={formData.password}
										onChange={handleInputChange}
									/>
								</div>
								<div>
									<InputPassword
										label="Confirmar contraseña"
										name="confirmPassword"
										autoComplete="new-password"
										value={formData.confirmPassword}
										onChange={handleInputChange}
									/>
								</div>
							</div>

							{/* Error Message */}
							{errorMessage && (
								<div className="text-sm text-red-300 mt-4">{errorMessage}</div>
							)}

							{/* Success Message */}
							{successMessage && (
								<div className="text-sm text-emerald-300 mt-4">{successMessage}</div>
							)}

							{/* Submit Button */}
							<Button
								type="submit"
								variant="primary"
								size="100%"
								loading={loading}
								className="mt-6"
							>
								Crear cuenta
							</Button>
						</form>

						<p className="mt-6 text-sm text-text-muted text-center">
							¿Ya tienes cuenta?{' '}
							<Link
								to="/login"
								className="text-sm text-primary-500 hover:text-primary-600 transition-colors font-medium"
							>
								Inicia sesión
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
