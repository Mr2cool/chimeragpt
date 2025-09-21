import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebAgent } from './web-agent'
import { performWebTask } from '@/ai/flows/web-agent'

// Mock the performWebTask function
vi.mock('@/ai/flows/web-agent', () => ({
  performWebTask: vi.fn()
}))

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>
}))

// Mock remark-gfm
vi.mock('remark-gfm', () => ({
  default: vi.fn()
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

const mockPerformWebTask = performWebTask as vi.MockedFunction<typeof performWebTask>

describe('WebAgent Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the main heading and description', () => {
      render(<WebAgent />)
      
      expect(screen.getByText('Advanced Web Agent')).toBeInTheDocument()
      expect(screen.getByText(/Provide a URL and a task/)).toBeInTheDocument()
    })

    it('should render all form fields with labels', () => {
      render(<WebAgent />)
      
      expect(screen.getByLabelText('Webpage URL')).toBeInTheDocument()
      expect(screen.getByLabelText('Task Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Your Data / Context (Optional)')).toBeInTheDocument()
    })

    it('should render form fields with default values', () => {
      render(<WebAgent />)
      
      const urlInput = screen.getByDisplayValue('https://en.wikipedia.org/wiki/React_(software)')
      const taskTextarea = screen.getByDisplayValue(/Summarize the history of this framework/)
      const userDataTextarea = screen.getByDisplayValue(/My name is John Doe/)
      
      expect(urlInput).toBeInTheDocument()
      expect(taskTextarea).toBeInTheDocument()
      expect(userDataTextarea).toBeInTheDocument()
    })

    it('should render submit button with correct initial text', () => {
      render(<WebAgent />)
      
      expect(screen.getByRole('button', { name: 'Run Agent' })).toBeInTheDocument()
    })

    it('should render form descriptions', () => {
      render(<WebAgent />)
      
      expect(screen.getByText('The full URL of the webpage you want the agent to start with.')).toBeInTheDocument()
      expect(screen.getByText('Describe what you want the agent to accomplish.')).toBeInTheDocument()
      expect(screen.getByText(/Provide any background information/)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate URL field when empty', async () => {
      render(<WebAgent />)
      
      const urlInput = screen.getByLabelText('Webpage URL')
      await user.clear(urlInput)
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument()
      })
    })

    it('should validate URL format', async () => {
      render(<WebAgent />)
      
      const urlInput = screen.getByLabelText('Webpage URL')
      await user.clear(urlInput)
      await user.type(urlInput, 'invalid-url')
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByText(/invalid url/i)).toBeInTheDocument()
      })
    })

    it('should validate task field when empty', async () => {
      render(<WebAgent />)
      
      const taskTextarea = screen.getByLabelText('Task Description')
      await user.clear(taskTextarea)
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument()
      })
    })

    it('should allow submission with valid data', async () => {
      mockPerformWebTask.mockResolvedValue({ result: 'Test result' })
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(mockPerformWebTask).toHaveBeenCalled()
      })
    })
  })

  describe('Form Input Handling', () => {
    it('should update URL field value', async () => {
      render(<WebAgent />)
      
      const urlInput = screen.getByLabelText('Webpage URL')
      await user.clear(urlInput)
      await user.type(urlInput, 'https://example.com')
      
      expect(urlInput).toHaveValue('https://example.com')
    })

    it('should update task field value', async () => {
      render(<WebAgent />)
      
      const taskTextarea = screen.getByLabelText('Task Description')
      await user.clear(taskTextarea)
      await user.type(taskTextarea, 'New task description')
      
      expect(taskTextarea).toHaveValue('New task description')
    })

    it('should update user data field value', async () => {
      render(<WebAgent />)
      
      const userDataTextarea = screen.getByLabelText('Your Data / Context (Optional)')
      await user.clear(userDataTextarea)
      await user.type(userDataTextarea, 'New user context')
      
      expect(userDataTextarea).toHaveValue('New user context')
    })

    it('should handle multiline text in textareas', async () => {
      render(<WebAgent />)
      
      const taskTextarea = screen.getByLabelText('Task Description')
      await user.clear(taskTextarea)
      await user.type(taskTextarea, 'Line 1{enter}Line 2{enter}Line 3')
      
      expect(taskTextarea).toHaveValue('Line 1\nLine 2\nLine 3')
    })
  })

  describe('Task Execution', () => {
    it('should call performWebTask with correct parameters', async () => {
      const mockResult = { result: 'Task completed successfully' }
      mockPerformWebTask.mockResolvedValue(mockResult)
      
      render(<WebAgent />)
      
      const urlInput = screen.getByLabelText('Webpage URL')
      const taskTextarea = screen.getByLabelText('Task Description')
      const userDataTextarea = screen.getByLabelText('Your Data / Context (Optional)')
      
      await user.clear(urlInput)
      await user.type(urlInput, 'https://test.com')
      await user.clear(taskTextarea)
      await user.type(taskTextarea, 'Test task')
      await user.clear(userDataTextarea)
      await user.type(userDataTextarea, 'Test context')
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(mockPerformWebTask).toHaveBeenCalledWith({
          url: 'https://test.com',
          task: 'Test task',
          userData: 'Test context'
        })
      })
    })

    it('should display loading state during task execution', async () => {
      mockPerformWebTask.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ result: 'Done' }), 100)))
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      expect(screen.getByRole('button', { name: 'Performing Task...' })).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
      
      // Check for loading skeletons
      expect(screen.getAllByTestId('skeleton')).toHaveLength.greaterThan(0)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Run Agent' })).toBeInTheDocument()
      })
    })

    it('should clear previous results when starting new task', async () => {
      mockPerformWebTask.mockResolvedValue({ result: 'First result' })
      
      render(<WebAgent />)
      
      // First execution
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByTestId('markdown-content')).toHaveTextContent('First result')
      })
      
      // Second execution
      mockPerformWebTask.mockResolvedValue({ result: 'Second result' })
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByTestId('markdown-content')).toHaveTextContent('Second result')
      })
    })
  })

  describe('Result Display', () => {
    it('should display successful result', async () => {
      const mockResult = { result: '# Test Result\n\nThis is a **markdown** result.' }
      mockPerformWebTask.mockResolvedValue(mockResult)
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByText('Agent Output')).toBeInTheDocument()
        expect(screen.getByTestId('markdown-content')).toHaveTextContent('# Test Result\n\nThis is a **markdown** result.')
      })
    })

    it('should render markdown content correctly', async () => {
      const mockResult = { result: 'Result with markdown formatting' }
      mockPerformWebTask.mockResolvedValue(mockResult)
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        const markdownContent = screen.getByTestId('markdown-content')
        expect(markdownContent).toBeInTheDocument()
        expect(markdownContent).toHaveTextContent('Result with markdown formatting')
      })
    })

    it('should not display result section when no result', () => {
      render(<WebAgent />)
      
      expect(screen.queryByText('Agent Output')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error when task execution fails', async () => {
      const errorMessage = 'Failed to fetch content from the provided URL.'
      mockPerformWebTask.mockRejectedValue(new Error(errorMessage))
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should handle non-Error exceptions', async () => {
      mockPerformWebTask.mockRejectedValue('String error')
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument()
      })
    })

    it('should clear previous errors when starting new task', async () => {
      // First execution with error
      mockPerformWebTask.mockRejectedValue(new Error('First error'))
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })
      
      // Second execution successful
      mockPerformWebTask.mockResolvedValue({ result: 'Success' })
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
        expect(screen.getByTestId('markdown-content')).toHaveTextContent('Success')
      })
    })

    it('should reset loading state after error', async () => {
      mockPerformWebTask.mockRejectedValue(new Error('Test error'))
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Run Agent' })).toBeInTheDocument()
        expect(screen.getByRole('button')).not.toBeDisabled()
      })
    })
  })

  describe('Loading States', () => {
    it('should show skeleton loading when task is executing', async () => {
      mockPerformWebTask.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ result: 'Done' }), 100)))
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      expect(screen.getByText('Agent Output')).toBeInTheDocument()
      expect(screen.getAllByTestId('skeleton')).toHaveLength.greaterThan(0)
      
      await waitFor(() => {
        expect(screen.queryAllByTestId('skeleton')).toHaveLength(0)
      })
    })

    it('should hide loading state after completion', async () => {
      mockPerformWebTask.mockResolvedValue({ result: 'Completed' })
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.queryAllByTestId('skeleton')).toHaveLength(0)
        expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and descriptions', () => {
      render(<WebAgent />)
      
      expect(screen.getByLabelText('Webpage URL')).toBeInTheDocument()
      expect(screen.getByLabelText('Task Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Your Data / Context (Optional)')).toBeInTheDocument()
    })

    it('should have proper ARIA attributes for error states', async () => {
      mockPerformWebTask.mockRejectedValue(new Error('Test error'))
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert')
        expect(errorAlert).toBeInTheDocument()
        expect(errorAlert).toHaveAttribute('data-variant', 'destructive')
      })
    })

    it('should support keyboard navigation', async () => {
      render(<WebAgent />)
      
      const urlInput = screen.getByLabelText('Webpage URL')
      const taskTextarea = screen.getByLabelText('Task Description')
      const userDataTextarea = screen.getByLabelText('Your Data / Context (Optional)')
      const submitButton = screen.getByRole('button', { name: 'Run Agent' })
      
      // Tab navigation
      urlInput.focus()
      expect(urlInput).toHaveFocus()
      
      await user.tab()
      expect(taskTextarea).toHaveFocus()
      
      await user.tab()
      expect(userDataTextarea).toHaveFocus()
      
      await user.tab()
      expect(submitButton).toHaveFocus()
    })

    it('should have proper heading hierarchy', () => {
      render(<WebAgent />)
      
      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toHaveTextContent('Advanced Web Agent')
    })
  })

  describe('Component State Management', () => {
    it('should maintain form state during loading', async () => {
      mockPerformWebTask.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ result: 'Done' }), 100)))
      
      render(<WebAgent />)
      
      const urlInput = screen.getByLabelText('Webpage URL')
      await user.clear(urlInput)
      await user.type(urlInput, 'https://test.com')
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      // Form values should be preserved during loading
      expect(urlInput).toHaveValue('https://test.com')
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Run Agent' })).toBeInTheDocument()
      })
    })

    it('should reset error and result states on new submission', async () => {
      // First submission with error
      mockPerformWebTask.mockRejectedValue(new Error('First error'))
      
      render(<WebAgent />)
      
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })
      
      // Second submission with success
      mockPerformWebTask.mockResolvedValue({ result: 'Success result' })
      await user.click(screen.getByRole('button', { name: 'Run Agent' }))
      
      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
        expect(screen.getByTestId('markdown-content')).toHaveTextContent('Success result')
      })
    })
  })
})