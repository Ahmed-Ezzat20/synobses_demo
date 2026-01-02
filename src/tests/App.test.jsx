import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { ApiProvider } from '../context/ApiContext';

// Mock the API context
const mockTranscribe = vi.fn();
const mockConnect = vi.fn();

const MockApiProvider = ({ children, isConnected = false }) => {
  return (
    <ApiProvider>
      {children}
    </ApiProvider>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    mockTranscribe.mockClear();
    mockConnect.mockClear();
  });

  it('renders the app without crashing', () => {
    render(
      <MockApiProvider>
        <App />
      </MockApiProvider>
    );
    expect(screen.getByText(/OmniASR/i)).toBeInTheDocument();
  });

  it('shows connection prompt when not connected', () => {
    render(
      <MockApiProvider isConnected={false}>
        <App />
      </MockApiProvider>
    );
    expect(screen.getByText(/Connect to your OmniASR API/i)).toBeInTheDocument();
  });

  it('shows transcription interface when connected', async () => {
    render(
      <MockApiProvider isConnected={true}>
        <App />
      </MockApiProvider>
    );
    
    await waitFor(() => {
      expect(screen.queryByText(/Connect to your OmniASR API/i)).not.toBeInTheDocument();
    });
  });
});
