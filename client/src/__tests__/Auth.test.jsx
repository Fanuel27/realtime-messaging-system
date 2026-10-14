import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Auth from '../components/Auth';
import { AuthProvider } from '../context/AuthContext';

describe('Auth Component', () => {
  it('renders login tab by default with email and password fields', () => {
    render(
      <AuthProvider>
        <Auth />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeDefined();
    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeDefined();
    expect(screen.queryByLabelText(/Username/i)).toBeNull();
  });

  it('switches to register mode when Register tab is clicked', () => {
    render(
      <AuthProvider>
        <Auth />
      </AuthProvider>
    );

    const registerTab = screen.getByRole('tab', { name: /^Register$/i });
    fireEvent.click(registerTab);

    expect(screen.getByRole('heading', { name: /Create an Account/i })).toBeDefined();
    expect(screen.getByLabelText(/Username/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeDefined();
  });

  it('shows error when submitting empty fields in register mode', async () => {
    render(
      <AuthProvider>
        <Auth />
      </AuthProvider>
    );

    const registerTab = screen.getByRole('tab', { name: /^Register$/i });
    fireEvent.click(registerTab);

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/Please enter a username/i)).toBeDefined();
    });
  });

  it('validates password length in login mode', async () => {
    render(
      <AuthProvider>
        <Auth />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: '123' },
    });
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/at least 6 characters/i)).toBeDefined();
    });
  });
});
