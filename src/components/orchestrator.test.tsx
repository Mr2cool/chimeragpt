import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import { ChimeraGPT } from './orchestrator'
import { runOrchestrator } from '@/ai/flows/orchestrator-flow'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock the orchestrator flow
jest.mock('@/ai/flows/orchestrator-flow', () => ({
  runOrchestrator: jest.fn()
}))

// Mock react-markdown
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>
  }
})

// Mock remark-gfm
jest.mock('remark-gfm', () => jest.fn())

// Mock Logo component
jest.mock('./icons', () => ({
  Logo: ({ className }: { className: string }) => (
    <div data-testid="logo" className={className}>Logo</div>
  )
}))

const mockPush = jest.fn()
const mockRunOrchestrator = runOrchestrator as jest.MockedFunction<typeof runOrchestrator>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('ChimeraGPT (Orchestrator)', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn()
    } as any)
    
    mockRunOrchestrator.mockClear()
    mockPush.mockClear()
  })

  it('renders the main interface correctly', () => {
    render(<ChimeraGPT />)
    
    // Check header elements
    expect(screen.getByTestId('logo')).toBeInTheDocument()
    expect(screen.getByText('ChimeraGPT')).toBeInTheDocument()
    expect(screen.getByText('A multi-agent system for complex task orchestration.')).toBeInTheDocument()
    
    // Check form elements
    expect(screen.getByText('Central Intelligence')).toBeInTheDocument()
    expect(screen.getByText('Your High-Level Goal')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Analyze the 'https:\/\/github.com\/google\/genkit' repo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Goal' })).toBeInTheDocument()
    
    // Check navigation link
    expect(screen.getByText('Or, go to the legacy repository analyzer →')).toBeInTheDocument()
  })

  it('handles form submission with valid input', async () => {
    const mockResult = {
      result: 'Task completed successfully. Here is the analysis of the repository.'
    }
    mockRunOrchestrator.mockResolvedValue(mockResult)
    
    render(<ChimeraGPT />)
    
    const textarea = screen.getByPlaceholderText(/Analyze the 'https:\/\/github.com\/google\/genkit' repo/)
    const submitButton = screen.getByRole('button', { name: 'Send Goal' })
    
    // Enter a valid goal
    fireEvent.change(textarea, {
      target: { value: 'Analyze the React repository and create a summary' }
    })
    
    // Submit the form
    fireEvent.click(submitButton)
    
    // Check loading state
    expect(screen.getByText('Executing...')).toBeInTheDocument()
    expect(screen.getByText('Execution in Progress...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    
    // Wait for completion
    await waitFor(() => {
      expect(mockRunOrchestrator).toHaveBeenCalledWith({
        goal: 'Analyze the React repository and create a summary'
      })
    })
    
    await waitFor(() => {
      expect(screen.getByText('Final Result')).toBeInTheDocument()
      expect(screen.getByTestId('markdown-content')).toHaveTextContent(
        'Task completed successfully. Here is the analysis of the repository.'
      )
    })
    
    // Check that loading state is cleared
    expect(screen.queryByText('Executing...')).not.toBeInTheDocument()
    expect(screen.queryByText('Execution in Progress...')).not.toBeInTheDocument()
    expect(submitButton).not.toBeDisabled()
  })

  it('handles form validation for empty input', async () => {
    render(<ChimeraGPT />)
    
    const submitButton = screen.getByRole('button', { name: 'Send Goal' })
    
    // Try to submit without entering a goal
    fireEvent.click(submitButton)
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Goal must be at least 10 characters.')).toBeInTheDocument()
    })
    
    // Should not call the orchestrator
    expect(mockRunOrchestrator).not.toHaveBeenCalled()
  })

  it('handles form validation for short input', async () => {
    render(<ChimeraGPT />)
    
    const textarea = screen.getByPlaceholderText(/Analyze the 'https:\/\/github.com\/google\/genkit' repo/)
    const submitButton = screen.getByRole('button', { name: 'Send Goal' })
    
    // Enter a goal that's too short
    fireEvent.change(textarea, {
      target: { value: 'Short' }
    })
    
    fireEvent.click(submitButton)
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Goal must be at least 10 characters.')).toBeInTheDocument()
    })
    
    // Should not call the orchestrator
    expect(mockRunOrchestrator).not.toHaveBeenCalled()
  })

  it('handles orchestrator execution errors', async () => {
    const errorMessage = 'Failed to execute orchestrator: Network error'
    mockRunOrchestrator.mockRejectedValue(new Error(errorMessage))
    
    render(<ChimeraGPT />)
    
    const textarea = screen.getByPlaceholderText(/Analyze the 'https:\/\/github.com\/google\/genkit' repo/)
    const submitButton = screen.getByRole('button', { name: 'Send Goal' })
    
    // Enter a valid goal
    fireEvent.change(textarea, {
      target: { value: 'Analyze the React repository and create a summary' }
    })
    
    // Submit the form
    fireEvent.click(submitButton)
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
    
    // Check that loading state is cleared
    expect(screen.queryByText('Executing...')).not.toBeInTheDocument()
    expect(screen.queryByText('Execution in Progress...')).not.toBeInTheDocument()
    expect(submitButton).not.toBeDisabled()
  })

  it('handles non-Error exceptions', async () => {
    mockRunOrchestrator.mockRejectedValue('String error')
    
    render(<ChimeraGPT />)
    
    const textarea = screen.getByPlaceholderText(/Analyze the 'https:\/\/github.com\/google\/genkit' repo/)
    const submitButton = screen.getByRole('button', { name: 'Send Goal' })
    
    // Enter a valid goal
    fireEvent.change(textarea, {
      target: { value: 'Analyze the React repository and create a summary' }
    })
    
    // Submit the form
    fireEvent.click(submitButton)
    
    // Wait for generic error to appear
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument()
    })
  })

  it('navigates to repo page when clicking the link', () => {
    render(<ChimeraGPT />)
    
    const repoLink = screen.getByText('Or, go to the legacy repository analyzer →')
    fireEvent.click(repoLink)
    
    expect(mockPush).toHaveBeenCalledWith('/repo')
  })

  it('clears previous results when submitting a new goal', async () => {
    const mockResult1 = { result: 'First result' }
    const mockResult2 = { result: 'Second result' }
    
    mockRunOrchestrator
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2)
    
    render(<ChimeraGPT />)
    
    const textarea = screen.getByPlaceholderText(/Analyze the 'https:\/\/github.com\/google\/genkit' repo/)
    const submitButton = screen.getByRole('button', { name: 'Send Goal' })
    
    // First submission
    fireEvent.change(textarea, {
      target: { value: 'First goal that is long enough' }
    })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('First result')
    })
    
    // Second submission
    fireEvent.change(textarea, {
      target: { value: 'Second goal that is also long enough' }
    })
    fireEvent.click(submitButton)
    
    // Should show loading and clear previous result
    expect(screen.getByText('Executing...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('Second result')
    })
    
    // Should not show first result anymore
    expect(screen.queryByText('First result')).not.toBeInTheDocument()
  })

  it('clears previous errors when submitting a new goal', async () => {
    mockRunOrchestrator
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce({ result: 'Success result' })
    
    render(<ChimeraGPT />)
    
    const textarea = screen.getByPlaceholderText(/Analyze the 'https:\/\/github.com\/google\/genkit' repo/)
    const submitButton = screen.getByRole('button', { name: 'Send Goal' })
    
    // First submission (error)
    fireEvent.change(textarea, {
      target: { value: 'First goal that is long enough' }
    })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument()
    })
    
    // Second submission (success)
    fireEvent.change(textarea, {
      target: { value: 'Second goal that is also long enough' }
    })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('Success result')
    })
    
    // Should not show error anymore
    expect(screen.queryByText('First error')).not.toBeInTheDocument()
  })

  it('displays loading skeletons during execution', async () => {
    // Make the promise never resolve to test loading state
    mockRunOrchestrator.mockImplementation(() => new Promise(() => {}))
    
    render(<ChimeraGPT />)
    
    const textarea = screen.getByPlaceholderText(/Analyze the 'https:\/\/github.com\/google\/genkit' repo/)
    const submitButton = screen.getByRole('button', { name: 'Send Goal' })
    
    fireEvent.change(textarea, {
      target: { value: 'Goal that is long enough for validation' }
    })
    fireEvent.click(submitButton)
    
    // Check loading elements
    expect(screen.getByText('Execution in Progress...')).toBeInTheDocument()
    expect(screen.getByText('Executing...')).toBeInTheDocument()
    
    // Check that skeletons are rendered (they have specific classes)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('handles form reset after successful submission', async () => {
    const mockResult = { result: 'Task completed' }
    mockRunOrchestrator.mockResolvedValue(mockResult)
    
    render(<ChimeraGPT />)
    
    const textarea = screen.getByPlaceholderText(/Analyze the 'https:\/\/github.com\/google\/genkit' repo/)
    const submitButton = screen.getByRole('button', { name: 'Send Goal' })
    
    // Enter and submit goal
    fireEvent.change(textarea, {
      target: { value: 'Goal that is long enough for validation' }
    })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('Task completed')
    })
    
    // Form should still contain the entered text (not reset)
    expect(textarea).toHaveValue('Goal that is long enough for validation')
  })

  it('renders markdown content with proper styling', async () => {
    const mockResult = {
      result: '# Heading\n\nThis is **bold** text with a [link](https://example.com)'
    }
    mockRunOrchestrator.mockResolvedValue(mockResult)
    
    render(<ChimeraGPT />)
    
    const textarea = screen.getByPlaceholderText(/Analyze the 'https:\/\/github.com\/google\/genkit' repo/)
    const submitButton = screen.getByRole('button', { name: 'Send Goal' })
    
    fireEvent.change(textarea, {
      target: { value: 'Goal that is long enough for validation' }
    })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      const markdownContent = screen.getByTestId('markdown-content')
      expect(markdownContent).toHaveTextContent('# Heading')
      expect(markdownContent).toHaveTextContent('This is **bold** text with a [link](https://example.com)')
    })
  })
})