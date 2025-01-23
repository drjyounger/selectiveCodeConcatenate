import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import FileConcatenationPage from './components/FileConcatenationPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FileConcatenationPage />
    </ThemeProvider>
  );
};

export default App;
